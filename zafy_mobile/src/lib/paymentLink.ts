import { WEB_URL } from '@/lib/contactCard';

/**
 * Lien de demande de paiement : « https://zafy.vercel.app/payer?r=<facture>&n=<prénom>&s=<sats> ».
 * Partagé par WhatsApp ou SMS, il est cliquable : il ouvre l'app sur Envoyer (App Links Android)
 * ou la page web, qui renvoie vers l'app. La facture fait foi ; prénom et montant servent à l'affichage.
 */
export type PaymentRequest = { invoice: string; name?: string; sats?: number };

const PATH = '/payer';
const PREFIXES = [`${WEB_URL}${PATH}?`, `zafy://payer?`];

const query = ({ invoice, name, sats }: PaymentRequest) =>
  new URLSearchParams({
    r: invoice,
    ...(name ? { n: name } : {}),
    ...(sats && sats > 0 ? { s: String(sats) } : {}),
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
