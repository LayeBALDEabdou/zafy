/** Numéros de téléphone et adresses Zafy (« 771234567@zafy »). */

/** Suffixe des adresses Zafy : le numéro de téléphone suivi de « @zafy ». */
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

/**
 * Adresse Zafy saisie dans Envoyer : « 771234567@zafy », « 77 123 45 67 » ou « +221771234567 ».
 * Renvoie le numéro au format international, sinon null.
 */
export function parseZafyAddress(input: string): string | null {
  const value = input
    .trim()
    .toLowerCase()
    .replace(/@zafy(\.app)?$/, '');
  return isPhoneLike(value) ? normalizePhone(value) : null;
}

/** « 771234567 » (numéro du profil, sans indicatif) → « 771234567@zafy ». */
export const zafyAddress = (phone: string) => `${phone}${ZAFY_SUFFIX}`;
