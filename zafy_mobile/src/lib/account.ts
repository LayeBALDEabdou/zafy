import { entropyToMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// Tout reste sur le téléphone, chiffré par le système (Keychain iOS / Keystore Android).
const KEYS = {
  profile: 'zafy.profile',
  mnemonic: 'zafy.mnemonic',
  pin: 'zafy.pin',
} as const;

export type Profile = {
  /** Nom complet : prénom et nom (« Fatou Diop »). */
  name: string;
  /** 9 chiffres, sans indicatif (ex. 771234567). */
  phone: string;
  /**
   * Trouvable dans l'annuaire Zafy : les autres peuvent payer « 771234567@zafy ».
   * Absent = oui (comptes créés avant cette option).
   */
  discoverable?: boolean;
};

/** 12 mots BIP39 (anglais, la norme reconnue par tous les wallets). */
export function generateMnemonic() {
  return entropyToMnemonic(Crypto.getRandomBytes(16), wordlist);
}

export const isValidMnemonic = (m: string) => validateMnemonic(m.trim().toLowerCase(), wordlist);

/** Le code n'est jamais stocké en clair : seulement son empreinte salée. */
async function hashPin(pin: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function createAccount(profile: Profile, pin: string, mnemonic: string) {
  const salt = Array.from(Crypto.getRandomBytes(16), (b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(KEYS.mnemonic, mnemonic);
  await SecureStore.setItemAsync(KEYS.pin, JSON.stringify({ salt, hash: await hashPin(pin, salt) }));
  await SecureStore.setItemAsync(KEYS.profile, JSON.stringify(profile));
}

export async function loadProfile(): Promise<Profile | null> {
  const raw = await SecureStore.getItemAsync(KEYS.profile);
  if (!raw) return null;
  // Anciens comptes : seulement un prénom (« firstName »)
  const { firstName, ...profile } = JSON.parse(raw) as Partial<Profile> & { firstName?: string };
  return { ...profile, name: profile.name ?? firstName ?? '', phone: profile.phone ?? '' } as Profile;
}

// --- Saisie du profil ---

/** Longueur maximale du nom complet. */
export const MAX_NAME_LENGTH = 60;

/** Espaces en trop retirés : «  fatou   diop » → « fatou diop ». */
export const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ');

/** Prénom et nom : au moins deux mots, uniquement des lettres (avec tiret ou apostrophe). */
export function isFullName(name: string) {
  const value = cleanName(name);
  return value.length <= MAX_NAME_LENGTH && /^\p{L}[\p{L}'’-]*(?: \p{L}[\p{L}'’-]*)+$/u.test(value);
}

/** Le prénom (premier mot du nom complet), pour saluer. */
export const firstNameOf = (name: string) => cleanName(name).split(' ')[0] ?? '';

/** Numéro sénégalais : exactement 9 chiffres, sans indicatif ni espace. */
export const isValidPhone = (phone: string) => /^\d{9}$/.test(phone);

/** Prénom et numéro modifiés depuis le Profil (les clés et le code ne changent pas). */
export async function saveProfile(profile: Profile) {
  await SecureStore.setItemAsync(KEYS.profile, JSON.stringify(profile));
}

export async function checkPin(pin: string) {
  const raw = await SecureStore.getItemAsync(KEYS.pin);
  if (!raw) return false;
  const { salt, hash } = JSON.parse(raw) as { salt: string; hash: string };
  return (await hashPin(pin, salt)) === hash;
}

export const loadMnemonic = () => SecureStore.getItemAsync(KEYS.mnemonic);

/** Efface le compte de ce téléphone (les fonds restent récupérables avec les 12 mots). */
export async function deleteAccount() {
  await Promise.all(Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)));
}
