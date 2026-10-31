/**
 * Carte de contact Zafy : prénom, numéro et adresse Spark dans un lien.
 * Partagée en QR (Profil → Ma carte) ou par message ; le lien ouvre l'écran /ajouter-contact.
 */
export type ContactCard = { name: string; phone?: string; address: string };

const PREFIX = 'zafy://ajouter-contact?';

export function contactCardLink({ name, phone, address }: ContactCard) {
  const params = new URLSearchParams({ n: name, a: address, ...(phone ? { p: phone } : {}) });
  return `${PREFIX}${params.toString()}`;
}

/** La carte contenue dans un QR ou un lien, sinon null. */
export function parseContactCard(data: string): ContactCard | null {
  const value = data.trim();
  if (!value.toLowerCase().startsWith(PREFIX)) return null;
  const params = new URLSearchParams(value.slice(PREFIX.length));
  const name = params.get('n')?.trim();
  const address = params.get('a')?.trim();
  if (!name || !address) return null;
  return { name, address, phone: params.get('p')?.trim() || undefined };
}
