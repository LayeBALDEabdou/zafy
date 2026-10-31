import {
  connect,
  defaultConfig,
  GetInfoRequest,
  InputType_Tags,
  ListPaymentsRequest,
  Network,
  PaymentDetails_Tags,
  PaymentMethod,
  PaymentRequest,
  PaymentStatus,
  PaymentType,
  PrepareSendPaymentRequest,
  ReceivePaymentMethod,
  Seed,
  SendPaymentMethod_Tags,
  type BreezSdkInterface,
  type Payment,
  type PrepareSendPaymentResponse,
  SdkEvent_Tags,
  type SdkEvent,
} from '@breeztech/breez-sdk-spark-react-native';
import { Directory, Paths } from 'expo-file-system';

import type { Transaction } from '@/data/mock';
import { t } from '@/i18n';
import { loadRecipients, rememberRecipient } from '@/lib/recipients';

/**
 * Réseau de test Spark (« Regtest ») : argent sans valeur, pas de clé API requise.
 * Pour passer en réel : Network.Mainnet + la clé API reçue de Breez.
 */
const NETWORK = Network.Regtest;
const API_KEY: string | undefined = undefined;

export const IS_TESTNET = NETWORK === Network.Regtest;
export const TEST_FAUCET_URL = 'https://app.lightspark.com/regtest-faucet';

let sdk: BreezSdkInterface | null = null;
let connecting: Promise<BreezSdkInterface> | null = null;

/** Ouvre le portefeuille à partir des 12 mots (une seule connexion à la fois). */
export function connectWallet(mnemonic: string) {
  if (sdk) return Promise.resolve(sdk);
  connecting ??= (async () => {
    const dir = new Directory(Paths.document, 'breez');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });

    const config = defaultConfig(NETWORK);
    config.apiKey = API_KEY;

    sdk = await connect({
      config,
      seed: new Seed.Mnemonic({ mnemonic, passphrase: undefined }),
      // Le SDK attend un chemin, pas une URI file://
      storageDir: decodeURIComponent(dir.uri.replace(/^file:\/\//, '')),
    });
    return sdk;
  })().finally(() => {
    connecting = null;
  });
  return connecting;
}

export async function disconnectWallet() {
  const current = sdk;
  sdk = null;
  await current?.disconnect();
}

function requireSdk() {
  if (!sdk) throw new Error(t('errors.walletNotConnected'));
  return sdk;
}

export async function getBalanceSats() {
  const info = await requireSdk().getInfo(GetInfoRequest.create({ ensureSynced: false }));
  return Number(info.balanceSats);
}

const METHOD: Record<PaymentMethod, Transaction['method']> = {
  [PaymentMethod.Lightning]: 'lightning',
  [PaymentMethod.Spark]: 'spark',
  [PaymentMethod.Token]: 'token',
  [PaymentMethod.Deposit]: 'deposit',
  [PaymentMethod.Withdraw]: 'withdraw',
  [PaymentMethod.Unknown]: 'other',
};

/** Convertit un paiement Breez au format affiché par l'app. */
function toTransaction(p: Payment, counterparty?: string): Transaction {
  const sign = p.paymentType === PaymentType.Send ? -1 : 1;
  // Texte de la facture (Lightning ou Spark), ex. « Paiement à Fatou » : utile au payeur.
  // Pour celui qui reçoit, c'est sa propre facture : on garde le type de paiement.
  let description: string | undefined;
  if (sign < 0 && p.details?.tag === PaymentDetails_Tags.Lightning) description = p.details.inner.description || undefined;
  if (sign < 0 && p.details?.tag === PaymentDetails_Tags.Spark) {
    description = p.details.inner.invoiceDetails?.description || undefined;
  }
  const status =
    p.status === PaymentStatus.Pending ? 'pending' : p.status === PaymentStatus.Failed ? 'failed' : undefined;
  return {
    id: p.id,
    description,
    method: METHOD[p.method],
    status,
    feeSats: Number(p.fees),
    amount: sign * Number(p.amount),
    date: new Date(Number(p.timestamp) * 1000),
    counterparty,
  };
}

export async function listTransactions(): Promise<Transaction[]> {
  const res = await requireSdk().listPayments(ListPaymentsRequest.create({ sortAscending: false }));
  const recipients = await loadRecipients().catch(() => ({}) as Record<string, string>);
  return res.payments.map((p) => toTransaction(p, recipients[p.id]));
}

/**
 * Facture Spark (montant facultatif) : contient l'identité de celui qui reçoit,
 * ce qui permet au payeur Zafy de reconnaître son contact. Payable par les portefeuilles Spark.
 */
export async function createSparkInvoice(amountSats: number, description: string) {
  const res = await requireSdk().receivePayment({
    paymentMethod: new ReceivePaymentMethod.SparkInvoice({
      amount: amountSats > 0 ? BigInt(amountSats) : undefined,
      tokenIdentifier: undefined,
      expiryTime: BigInt(Math.floor(Date.now() / 1000) + 3600),
      description,
      senderPublicKey: undefined,
    }),
  });
  return res.paymentRequest;
}

/** Facture Lightning (montant facultatif). */
export async function createInvoice(amountSats: number, description = t('receive.invoiceDefault')) {
  const res = await requireSdk().receivePayment({
    paymentMethod: new ReceivePaymentMethod.Bolt11Invoice({
      description,
      amountSats: amountSats > 0 ? BigInt(amountSats) : undefined,
      expirySecs: 3600,
      paymentHash: undefined,
      receiverIdentityPublicKey: undefined,
    }),
  });
  return res.paymentRequest;
}

/** Adresse Spark (fixe) : la plus simple pour recevoir des sats de test. */
export async function getSparkAddress() {
  const res = await requireSdk().receivePayment({ paymentMethod: new ReceivePaymentMethod.SparkAddress() });
  return res.paymentRequest;
}

export async function getBitcoinAddress() {
  const res = await requireSdk().receivePayment({
    paymentMethod: new ReceivePaymentMethod.BitcoinAddress({ newAddress: undefined }),
  });
  return res.paymentRequest;
}

export type Destination = {
  /** `invoice` = facture Lightning, `sparkInvoice` = facture Spark (créée par Zafy). */
  kind: 'invoice' | 'sparkInvoice' | 'spark' | 'bitcoin' | 'other';
  /** Montant déjà fixé par la facture, le cas échéant. */
  amountSats?: number;
  description?: string;
  /** Nœud qui encaisse la facture Lightning : identifie le destinataire (pour les signalements). */
  payeePubkey?: string;
  /**
   * Identité Spark de celui qui reçoit (adresse ou facture Spark). Garantie par le réseau :
   * sert à reconnaître un contact sans faire confiance au texte de la facture.
   */
  identityPublicKey?: string;
};

/** Reconnaît ce que l'utilisateur a collé ou saisi (facture, adresse Spark, adresse Bitcoin). */
export async function describeDestination(input: string): Promise<Destination> {
  const parsed = await requireSdk().parse(input.trim());
  switch (parsed.tag) {
    case InputType_Tags.Bolt11Invoice: {
      const { amountMsat, description, payeePubkey } = parsed.inner[0];
      return {
        kind: 'invoice',
        amountSats: amountMsat !== undefined ? Number(amountMsat / 1000n) : undefined,
        description: description || undefined,
        payeePubkey,
      };
    }
    case InputType_Tags.SparkAddress:
      return { kind: 'spark', identityPublicKey: parsed.inner[0].identityPublicKey };
    case InputType_Tags.SparkInvoice: {
      const { amount, description, identityPublicKey } = parsed.inner[0];
      return {
        kind: 'sparkInvoice',
        amountSats: amount ? Number(amount) : undefined,
        description: description || undefined,
        identityPublicKey,
      };
    }
    case InputType_Tags.BitcoinAddress:
      return { kind: 'bitcoin' };
    default:
      return { kind: 'other' };
  }
}

export type PreparedPayment = {
  prepared: PrepareSendPaymentResponse;
  amountSats: number;
  feeSats: number;
  /** Ce qui a été saisi (adresse ou facture) : noté après l'envoi pour l'historique. */
  destination: string;
};

/** Calcule montant et frais avant d'envoyer (facture, adresse Spark ou Bitcoin). */
export async function prepareSend(destination: string, amountSats: number): Promise<PreparedPayment> {
  const prepared = await requireSdk().prepareSendPayment(
    PrepareSendPaymentRequest.create({
      paymentRequest: new PaymentRequest.Input({ input: destination.trim() }),
      amount: amountSats > 0 ? BigInt(amountSats) : undefined,
    }),
  );
  const method = prepared.paymentMethod;
  let feeSats = 0;
  if (method.tag === SendPaymentMethod_Tags.Bolt11Invoice) {
    feeSats = Number(method.inner.lightningFeeSats);
  } else if (method.tag === SendPaymentMethod_Tags.SparkAddress || method.tag === SendPaymentMethod_Tags.SparkInvoice) {
    feeSats = Number(method.inner.fee);
  } else if (method.tag === SendPaymentMethod_Tags.BitcoinAddress) {
    const q = method.inner.feeQuote.speedMedium;
    feeSats = Number(q.userFeeSat) + Number(q.l1BroadcastFeeSat);
  }
  return { prepared, amountSats: Number(prepared.amount), feeSats, destination: destination.trim() };
}

export async function sendPrepared({ prepared, destination }: PreparedPayment) {
  const res = await requireSdk().sendPayment({
    prepareResponse: prepared,
    options: undefined,
    idempotencyKey: undefined,
  });
  await rememberRecipient(res.payment.id, destination).catch(() => {});
  return toTransaction(res.payment, destination);
}

/** Prix d'un bitcoin par devise (« USD », « EUR »…), fourni par Breez. */
export async function fetchBtcPrices(): Promise<Record<string, number>> {
  const { rates } = await requireSdk().listFiatRates();
  return Object.fromEntries(rates.map((r) => [r.coin.toUpperCase(), r.value]));
}

/** Le paiement reçu que signale cet événement, sinon null. */
export function receivedPayment(event: SdkEvent): Transaction | null {
  if (event.tag !== SdkEvent_Tags.PaymentSucceeded) return null;
  const { payment } = event.inner;
  return payment.paymentType === PaymentType.Receive ? toTransaction(payment) : null;
}

/** Écoute les événements (paiement reçu, synchro…). Renvoie la fonction de désinscription. */
export async function onWalletEvent(handler: (event: SdkEvent) => void) {
  const current = requireSdk();
  const id = await current.addEventListener({
    onEvent: async (event) => handler(event),
  });
  return () => {
    current.removeEventListener(id).catch(() => {});
  };
}
