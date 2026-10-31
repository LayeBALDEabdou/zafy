// Breez est un module natif : sur le web (aperçu), le portefeuille n'est pas disponible.
import type { Transaction } from '@/data/mock';
import { t } from '@/i18n';

export const IS_TESTNET = true;
export const TEST_FAUCET_URL = 'https://app.lightspark.com/regtest-faucet';

const unavailable = () => Promise.reject(new Error(t('errors.mobileOnly')));

export type Destination = {
  kind: 'invoice' | 'sparkInvoice' | 'spark' | 'bitcoin' | 'other';
  amountSats?: number;
  description?: string;
  payeePubkey?: string;
  identityPublicKey?: string;
};
export const createSparkInvoice = (_amountSats: number, _description: string): Promise<string> => unavailable();
export const describeDestination = (_input: string): Promise<Destination> => unavailable();

export type PreparedPayment = { prepared: unknown; amountSats: number; feeSats: number; destination: string };

export const connectWallet = (_mnemonic: string): Promise<unknown> => unavailable();
export const disconnectWallet = async () => {};
export const getBalanceSats = (): Promise<number> => unavailable();
export const listTransactions = (): Promise<Transaction[]> => unavailable();
export const createInvoice = (_amountSats: number, _description?: string): Promise<string> => unavailable();
export const getSparkAddress = (): Promise<string> => unavailable();
export const getBitcoinAddress = (): Promise<string> => unavailable();
export const prepareSend = (_destination: string, _amountSats: number): Promise<PreparedPayment> => unavailable();
export const sendPrepared = (_payment: PreparedPayment): Promise<Transaction> => unavailable();
export const fetchBtcPrices = (): Promise<Record<string, number>> => unavailable();
export const receivedPayment = (_event: unknown): Transaction | null => null;
export const onWalletEvent = (_handler: (event: unknown) => void): Promise<() => void> => unavailable();
