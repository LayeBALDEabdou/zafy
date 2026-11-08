import { entropyToMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { t } from '@/i18n';

// Tout reste sur le téléphone, chiffré par le système (Keychain iOS / Keystore Android).
const KEYS = {
  profile: 'zafy.profile',
  mnemonic: 'zafy.mnemonic',
  pin: 'zafy.pin',
  /** Codes faux consécutifs et fin du blocage en cours. */
  pinAttempts: 'zafy.pin.attempts',
  /** « off » : déverrouillage par empreinte désactivé par l'utilisateur. */
  biometric: 'zafy.biometric',
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

/** Enregistre l'empreinte salée d'un nouveau code (jamais le code lui-même). */
async function storePin(pin: string) {
  const salt = Array.from(Crypto.getRandomBytes(16), (b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(KEYS.pin, JSON.stringify({ salt, hash: await hashPin(pin, salt) }));
}

export async function createAccount(profile: Profile, pin: string, mnemonic: string) {
  await SecureStore.setItemAsync(KEYS.mnemonic, mnemonic);
  await storePin(pin);
  await SecureStore.deleteItemAsync(KEYS.pinAttempts);
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

async function matchesPin(pin: string) {
  const raw = await SecureStore.getItemAsync(KEYS.pin);
  if (!raw) return false;
  const { salt, hash } = JSON.parse(raw) as { salt: string; hash: string };
  return (await hashPin(pin, salt)) === hash;
}

// --- Protection du code contre les essais en série ---

/** Codes faux autorisés avant le premier blocage. */
const FREE_ATTEMPTS = 5;
const FIRST_LOCK_S = 30;
const MAX_LOCK_S = 15 * 60;

type Attempts = { fails: number; until: number };

async function loadAttempts(): Promise<Attempts> {
  try {
    const raw = await SecureStore.getItemAsync(KEYS.pinAttempts);
    return raw ? (JSON.parse(raw) as Attempts) : { fails: 0, until: 0 };
  } catch {
    return { fails: 0, until: 0 };
  }
}

/**
 * `ok` : bon code. Sinon `lockedFor` (secondes) si les essais sont bloqués,
 * ou `left` = essais restants avant le prochain blocage.
 */
export type PinCheck = { ok: true } | { ok: false; lockedFor: number } | { ok: false; left: number };

/**
 * Vérifie le code, avec blocage après 5 codes faux : 30 s, puis le double à chaque nouvel échec (15 min au plus).
 * Le compteur est gardé dans le stockage sécurisé : fermer l'app ne le remet pas à zéro.
 */
export async function verifyPin(pin: string): Promise<PinCheck> {
  const attempts = await loadAttempts();
  const now = Date.now();
  if (attempts.until > now) return { ok: false, lockedFor: Math.ceil((attempts.until - now) / 1000) };
  if (await matchesPin(pin)) {
    await SecureStore.deleteItemAsync(KEYS.pinAttempts);
    return { ok: true };
  }
  const fails = attempts.fails + 1;
  const extra = fails - FREE_ATTEMPTS;
  const lockS = extra >= 0 ? Math.min(FIRST_LOCK_S * 2 ** extra, MAX_LOCK_S) : 0;
  await SecureStore.setItemAsync(KEYS.pinAttempts, JSON.stringify({ fails, until: lockS ? now + lockS * 1000 : 0 }));
  return lockS ? { ok: false, lockedFor: lockS } : { ok: false, left: FREE_ATTEMPTS - fails };
}

/** Message à afficher après un code refusé (null si le code était bon). */
export function pinError(check: PinCheck) {
  if (check.ok) return null;
  if ('lockedFor' in check) {
    const s = check.lockedFor;
    return s >= 60
      ? t('security.lockedMinutes', { n: Math.ceil(s / 60) })
      : t('security.lockedSeconds', { n: s });
  }
  return check.left <= 3 ? t('security.wrongPinLeft', { n: check.left }) : t('common.wrongPin');
}

/** Code trop facile à deviner : 4 chiffres identiques (1111) ou qui se suivent (1234, 9876). */
export function isWeakPin(pin: string) {
  if (/^(\d)\1{3}$/.test(pin)) return true;
  const d = [...pin].map(Number);
  const steps = d.slice(1).map((n, i) => n - d[i]);
  return steps.every((s) => s === 1) || steps.every((s) => s === -1);
}

/** Change le code : l'ancien doit être bon (mêmes règles de blocage que le déverrouillage). */
export async function changePin(current: string, next: string): Promise<PinCheck> {
  const check = await verifyPin(current);
  if (check.ok) await storePin(next);
  return check;
}

// --- Empreinte ---

/** Déverrouillage par empreinte autorisé par l'utilisateur (oui par défaut). */
export const loadBiometricEnabled = async () => (await SecureStore.getItemAsync(KEYS.biometric)) !== 'off';

export const saveBiometricEnabled = (enabled: boolean) =>
  enabled ? SecureStore.deleteItemAsync(KEYS.biometric) : SecureStore.setItemAsync(KEYS.biometric, 'off');

export const loadMnemonic = () => SecureStore.getItemAsync(KEYS.mnemonic);

/** Efface le compte de ce téléphone (les fonds restent récupérables avec les 12 mots). */
export async function deleteAccount() {
  await Promise.all(Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)));
}
