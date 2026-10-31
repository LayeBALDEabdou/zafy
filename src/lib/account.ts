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
  firstName: string;
  /** 9 chiffres, sans indicatif (ex. 771234567). */
  phone: string;
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
  return raw ? (JSON.parse(raw) as Profile) : null;
}

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
