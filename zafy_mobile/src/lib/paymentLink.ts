import { WEB_URL } from '@/lib/contactCard';
import type { Currency } from '@/lib/currency';

/**
 * Lien de demande de paiement : « https://zafy.vercel.app/payer?r=<facture>&n=<prénom>&m=5 000 FCFA ».
 * Partagé par WhatsApp ou SMS, il est cliquable : il ouvre l'app sur Envoyer (App Links Android)
 * ou la page web, qui renvoie vers l'app. La facture fait foi ; prénom et montant servent à l'affichage.
 */
export type PaymentRequest = {
  invoice: string;
  name?: string;
  /** Montant écrit dans la devise de celui qui demande (« 5 000 FCFA »), pour l'affichage. */
  amount?: string;
};

const PATH = '/payer';
const PREFIXES = [`${WEB_URL}${PATH}?`, `zafy://payer?`];

const query = ({ invoice, name, amount }: PaymentRequest) =>
  new URLSearchParams({
    r: invoice,
    ...(name ? { n: name } : {}),
    ...(amount ? { m: amount } : {}),
  }).toString();

/** Lien à partager. */
export const paymentLink = (request: PaymentRequest) => `${WEB_URL}${PATH}?${query(request)}`;

/** Chemin de l'écran dans l'app (pour y revenir après le déverrouillage). */
export const paymentPath = (request: PaymentRequest) => `${PATH}?${query(request)}`;

/** La facture contenue dans un lien de paiement Zafy, sinon null. */
export function parsePaymentLink(data: string): string | null {
  const value = data.trim();
  const prefix = PREFIXES.find((p) => value.toLowerCase().startsWith(p.toLowerCase()));
  if (!prefix) return null;
  return new URLSearchParams(value.slice(prefix.length)).get('r')?.trim() || null;
}

// --- Lien court : « https://zafy.vercel.app/payer/771234567?m=5000&c=XOF » ---
// Celui qui paie retrouve le portefeuille dans l'annuaire Zafy ; le montant est converti dans sa devise.

export type ShortPayment = { phone: string; amount?: number; currency?: Exclude<Currency, 'SAT'> };

const SHORT = /^(?:https:\/\/zafy\.vercel\.app|zafy:\/)\/payer\/(\d{8,15})\/?(?:\?(.*))?$/i;
const FIAT = ['XOF', 'EUR', 'USD'] as const;

const shortQuery = ({ amount, currency }: Omit<ShortPayment, 'phone'>) =>
  amount && amount > 0 && currency ? `?${new URLSearchParams({ m: String(amount), c: currency })}` : '';

/** Lien court de demande de paiement (montant facultatif, dans la devise de celui qui demande). */
export const shortPaymentLink = ({ phone, ...rest }: ShortPayment) => `${WEB_URL}${PATH}/${phone}${shortQuery(rest)}`;

export const shortPaymentPath = ({ phone, ...rest }: ShortPayment) => `${PATH}/${phone}${shortQuery(rest)}`;

/** Lit montant et devise (« m », « c ») ; ignorés s'ils sont invalides. */
export function readAmount(m?: string | null, c?: string | null): Omit<ShortPayment, 'phone'> {
  const amount = Number(m);
  const currency = FIAT.find((f) => f === c?.toUpperCase());
  return amount > 0 && Number.isFinite(amount) && currency ? { amount, currency } : {};
}

/** Numéro, montant et devise contenus dans un lien court de paiement, sinon null. */
export function parseShortPayment(data: string): ShortPayment | null {
  const m = data.trim().match(SHORT);
  if (!m) return null;
  const params = new URLSearchParams(m[2] ?? '');
  return { phone: m[1], ...readAmount(params.get('m'), params.get('c')) };
}
