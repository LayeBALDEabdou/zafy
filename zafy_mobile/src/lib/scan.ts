import { parseContactCard, parseShortCard } from '@/lib/contactCard';
import { parsePaymentLink, parseShortPayment } from '@/lib/paymentLink';

// Transmet le résultat du scanner à l'écran qui l'a ouvert.
type Listener = (value: string) => void;

// Pile : l'écran du dessus reçoit le scan ; en revenant en arrière, l'écran précédent le récupère.
const listeners: Listener[] = [];

export function onScan(fn: Listener) {
  listeners.push(fn);
  return () => {
    const i = listeners.lastIndexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export const emitScan = (value: string) => listeners.at(-1)?.(value);

/**
 * Nettoie le contenu d'un QR de paiement :
 * - « lightning:LNBC… » → « lnbc… » (les QR sont souvent en majuscules) ;
 * - « bitcoin:adresse?lightning=lnbc…&spark=spark1… » (QR unifié BIP21) → la facture Spark si présente
 *   (Zafy y lit l'identité de celui qui reçoit), sinon la facture Lightning, sinon l'adresse ;
 * - carte de contact Zafy → son adresse ;
 * - lien de paiement Zafy (« https://zafy.vercel.app/payer?r=… ») → sa facture ;
 * - lien court de carte ou de paiement (« …/ajouter-contact/771234567 », « …/payer/771234567 ») → le numéro (cherché dans l'annuaire Zafy).
 */
export function cleanDestination(raw: string) {
  const value = raw.trim();
  const card = parseContactCard(value);
  if (card) return card.address;
  const shortPhone = parseShortCard(value) ?? parseShortPayment(value)?.phone;
  if (shortPhone) return shortPhone;
  const linked = parsePaymentLink(value);
  if (linked) return cleanDestination(linked);
  const [scheme, rest] = value.includes(':') ? [value.slice(0, value.indexOf(':')).toLowerCase(), value.slice(value.indexOf(':') + 1)] : ['', value];

  if (scheme === 'bitcoin') {
    const [address, query = ''] = rest.split('?');
    // Noms de paramètres insensibles à la casse (QR en majuscules)
    const params = new Map([...new URLSearchParams(query)].map(([k, v]) => [k.toLowerCase(), v]));
    const invoice = params.get('spark') || params.get('lightning');
    return invoice ? invoice.toLowerCase() : address;
  }
  const body = scheme === 'lightning' ? rest : value;
  // Facture Lightning ou Spark en majuscules (QR compact) → minuscules (format attendu partout)
  return /^(ln|spark)/i.test(body) ? body.toLowerCase() : body;
}
