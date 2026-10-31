/**
 * Carte de contact Zafy : prénom, numéro et adresse Spark dans un lien.
 * Partagée en QR (Profil → Ma carte) ou par message. Le lien https s'ouvre dans WhatsApp :
 * il ouvre l'app directement (App Links Android) ou la page web, qui renvoie vers l'app.
 */
export type ContactCard = { name: string; phone?: string; address: string };

/** Site web de Zafy (zafy_web), qui sert aussi la page /ajouter-contact. */
export const WEB_URL = 'https://zafy.vercel.app';

const PATH = '/ajouter-contact';
// Lien web actuel, et ancien lien zafy:// (cartes déjà partagées)
const PREFIXES = [`${WEB_URL}${PATH}?`, `zafy://ajouter-contact?`];

const query = ({ name, phone, address }: ContactCard) =>
  new URLSearchParams({ n: name, a: address, ...(phone ? { p: phone } : {}) }).toString();

/** Lien à partager : « https://zafy.vercel.app/ajouter-contact?n=…&a=…&p=… ». */
export const contactCardLink = (card: ContactCard) => `${WEB_URL}${PATH}?${query(card)}`;

/** Chemin de l'écran d'ajout dans l'app (pour y revenir après le déverrouillage). */
export const contactCardPath = (card: ContactCard) => `${PATH}?${query(card)}`;

/** La carte contenue dans un QR ou un lien, sinon null. */
export function parseContactCard(data: string): ContactCard | null {
  const value = data.trim();
  const prefix = PREFIXES.find((p) => value.toLowerCase().startsWith(p.toLowerCase()));
  if (!prefix) return null;
  const params = new URLSearchParams(value.slice(prefix.length));
  const name = params.get('n')?.trim();
  const address = params.get('a')?.trim();
  if (!name || !address) return null;
  return { name, address, phone: params.get('p')?.trim() || undefined };
}
