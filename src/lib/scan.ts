import { parseContactCard } from '@/lib/contactCard';

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
 * - « bitcoin:adresse?amount=…&lightning=lnbc… » → la facture Lightning si présente, sinon l'adresse ;
 * - carte de contact Zafy → son adresse.
 */
export function cleanDestination(raw: string) {
  const value = raw.trim();
  const card = parseContactCard(value);
  if (card) return card.address;
  const [scheme, rest] = value.includes(':') ? [value.slice(0, value.indexOf(':')).toLowerCase(), value.slice(value.indexOf(':') + 1)] : ['', value];

  if (scheme === 'bitcoin') {
    const [address, query = ''] = rest.split('?');
    const lightning = new URLSearchParams(query).get('lightning');
    return lightning ? lightning.toLowerCase() : address;
  }
  const body = scheme === 'lightning' ? rest : value;
  // Facture Lightning ou Spark en majuscules (QR compact) → minuscules (format attendu partout)
  return /^(ln|spark)/i.test(body) ? body.toLowerCase() : body;
}
