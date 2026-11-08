/**
 * Numéros de téléphone et adresses Zafy.
 * Adresse Zafy : initiale du prénom, nom de famille et numéro, « a.balde.776511631@zafy ».
 * Le numéro la rend unique (un numéro = un compte) ; le nom permet de vérifier qu'on paie la bonne personne.
 */

/** Suffixe des adresses Zafy. */
export const ZAFY_SUFFIX = '@zafy';

/** « 77 412 08 12 » → « +221774120812 » (numéro sénégalais par défaut). */
export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, '');
  if (input.trim().startsWith('+')) return `+${digits}`;
  if (digits.length === 9) return `+221${digits}`;
  return `+${digits.replace(/^00/, '')}`;
}

/** Un vrai numéro : uniquement des chiffres, espaces, points ou tirets, et de 8 à 15 chiffres. */
export function isPhoneLike(input: string) {
  const value = input.trim();
  if (!/^\+?[\d\s.-]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '').replace(/^00/, '');
  return digits.length >= 8 && digits.length <= 15;
}

/** Numéro au format international (« +221774120812 ») valide. */
export const isNormalizedPhone = (phone: string) => /^\+\d{8,15}$/.test(phone);

/** Minuscules, sans accents ni caractères spéciaux : « N'Diaye » → « ndiaye », « Sène » → « sene ». */
const slug = (word: string) =>
  word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

/** Partie « nom » de l'adresse : « Abdoulaye Balde » → « a.balde ». Vide si le nom est inutilisable. */
export function zafyHandle(fullName: string) {
  const words = fullName.trim().split(/\s+/).map(slug).filter(Boolean);
  if (words.length < 2) return '';
  return `${words[0].charAt(0)}.${words[words.length - 1]}`;
}

/** Nom complet et numéro du profil (« 776511631 ») → « a.balde.776511631@zafy ». */
export function zafyAddress(fullName: string, phone: string) {
  const handle = zafyHandle(fullName);
  return `${handle ? `${handle}.` : ''}${phone}${ZAFY_SUFFIX}`;
}

/** Adresse Zafy lue : numéro au format international, et partie « nom » si elle a été écrite. */
export type ZafyAddress = { phone: string; handle?: string };

/**
 * Adresse saisie dans Envoyer : « a.balde.776511631@zafy », ou simplement le numéro
 * (« 776511631 », « 77 651 16 31 », « +221776511631 », « 776511631@zafy »). Sinon null.
 */
export function parseZafyAddress(input: string): ZafyAddress | null {
  const value = input.trim().toLowerCase();
  const full = value.match(/^([a-z0-9])\.([a-z0-9]+)\.(\d{9})(?:@zafy)?$/);
  if (full) return { phone: normalizePhone(full[3]), handle: `${full[1]}.${full[2]}` };
  const bare = value.replace(/@zafy(\.app)?$/, '');
  return isPhoneLike(bare) ? { phone: normalizePhone(bare) } : null;
}
