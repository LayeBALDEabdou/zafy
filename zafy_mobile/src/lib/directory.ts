import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import type { Event } from 'nostr-tools/pure';

import type { Profile } from '@/lib/account';
import { checkWalletSignature, describeDestination, getSparkAddress, signWithWallet } from '@/lib/breez';
import { normalizePhone } from '@/lib/phone';
import { myPubkey, publish, query } from '@/lib/relays';

/**
 * Annuaire public Zafy sur Nostr : « tel numéro → tel portefeuille ».
 *
 * Chaque utilisateur publie un profil remplaçable (NIP-78, kind 30078) qui contient :
 * - son prénom et son adresse Spark (pour être payé avec « 771234567@zafy ») ;
 * - l'empreinte de son numéro, jamais le numéro en clair ;
 * - une preuve : sa clé Nostr signée par la clé d'identité de son portefeuille Spark.
 *
 * La preuve empêche d'attribuer un profil au portefeuille de quelqu'un d'autre.
 * Le numéro, lui, ne peut pas être prouvé sans SMS : si plusieurs portefeuilles revendiquent
 * le même numéro, l'adresse est refusée (« contestée ») plutôt que de risquer de payer un imposteur.
 */

const PROFILE_KIND = 30078;
const PROFILE_D = 'zafy-profile';
const APP_TAG = 'zafy';
const DELETION_KIND = 5;
const MAX_NAME = 40;
/** On republie de temps en temps, pour rester présent sur les relais. */
const REFRESH_MS = 7 * 24 * 3600 * 1000;

export type PublicProfile = {
  /** Clé Nostr de l'auteur. */
  pubkey: string;
  name: string;
  /** Adresse Spark où envoyer l'argent. */
  address: string;
  /** Identité Spark du portefeuille (prouvée par signature). */
  identity: string;
  phoneHash: string;
  updatedAt: Date;
};

export type PhoneLookup =
  | { status: 'found'; profile: PublicProfile }
  | { status: 'none' }
  /** Plusieurs portefeuilles revendiquent ce numéro : on ne choisit pas. */
  | { status: 'contested'; profiles: PublicProfile[] };

/** Empreinte d'un numéro au format international (« +221771234567 »). */
export const phoneHash = (phone: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `zafy-phone:${phone}`);

/** Message signé par le portefeuille : relie la clé Nostr à l'identité Spark. */
const proofMessage = (pubkey: string) => `zafy-profile:v1:${pubkey}`;

// --- Publication de son propre profil ---

/** Publie (ou met à jour) le profil public de l'utilisateur. */
async function publishProfile(profile: Profile) {
  const pubkey = await myPubkey();
  const address = await getSparkAddress();
  const { identity, signature } = await signWithWallet(proofMessage(pubkey));
  // L'identité qui signe doit être celle contenue dans l'adresse : sinon le profil serait refusé par tous.
  const dest = await describeDestination(address);
  if (dest.identityPublicKey !== identity) throw new Error('Identité Spark incohérente');
  const hash = await phoneHash(normalizePhone(profile.phone));
  await publish({
    kind: PROFILE_KIND,
    tags: [
      ['d', PROFILE_D],
      ['t', APP_TAG],
      ['i', `phonehash:${hash}`],
      ['i', `sparkid:${identity}`],
    ],
    content: JSON.stringify({ v: 1, name: profile.firstName.slice(0, MAX_NAME), address, identity, proof: signature }),
  });
}

/** Retire le profil public : version vide qui remplace l'ancienne, plus une demande de suppression (NIP-09). */
async function unpublishProfile() {
  const pubkey = await myPubkey();
  await publish({ kind: PROFILE_KIND, tags: [['d', PROFILE_D], ['t', APP_TAG]], content: '' });
  await publish({
    kind: DELETION_KIND,
    tags: [
      ['a', `${PROFILE_KIND}:${pubkey}:${PROFILE_D}`],
      ['k', String(PROFILE_KIND)],
    ],
    content: '',
  }).catch(() => {});
}

// Dernière version publiée depuis ce téléphone : évite de republier à chaque ouverture.
const stateFile = () => new File(Paths.document, 'profil-public.json');

async function lastPublished(): Promise<{ fingerprint: string; at: number } | null> {
  try {
    const f = stateFile();
    return f.exists ? JSON.parse(await f.text()) : null;
  } catch {
    return null;
  }
}

async function rememberPublished(fingerprint: string) {
  const f = stateFile();
  if (!f.exists) f.create();
  await f.write(JSON.stringify({ fingerprint, at: Date.now() }));
}

/**
 * Met l'annuaire public en accord avec le profil : publié si l'utilisateur est trouvable, retiré sinon.
 * Ne fait rien si c'est déjà à jour. Le portefeuille doit être ouvert.
 */
export async function syncPublicProfile(profile: Profile) {
  const discoverable = profile.discoverable !== false;
  const pubkey = await myPubkey();
  const fingerprint = JSON.stringify(
    discoverable ? [pubkey, profile.firstName, profile.phone] : [pubkey, 'hidden'],
  );
  const last = await lastPublished();
  if (last?.fingerprint === fingerprint && (!discoverable || Date.now() - last.at < REFRESH_MS)) return;
  if (discoverable) await publishProfile(profile);
  else await unpublishProfile();
  await rememberPublished(fingerprint);
}

// --- Lecture et vérification ---

function parseProfile(event: Event): PublicProfile | null {
  const tag = (name: string) => event.tags.find((t) => t[0] === name)?.[1];
  if (tag('d') !== PROFILE_D || !event.content) return null;
  const hash = event.tags.find((t) => t[0] === 'i' && t[1]?.startsWith('phonehash:'))?.[1]?.slice('phonehash:'.length);
  try {
    const data = JSON.parse(event.content) as Record<string, unknown>;
    const { name, address, identity, proof } = data;
    if (data.v !== 1 || !hash) return null;
    if (typeof name !== 'string' || typeof address !== 'string' || typeof identity !== 'string') return null;
    if (typeof proof !== 'string' || !/^[0-9a-f]{64,66}$/.test(identity)) return null;
    return {
      pubkey: event.pubkey,
      name: name.trim().slice(0, MAX_NAME),
      address,
      identity,
      phoneHash: hash,
      updatedAt: new Date(event.created_at * 1000),
    };
  } catch {
    return null;
  }
}

// Une vérification par événement suffit (la signature ne change pas)
const verified = new Map<string, boolean>();

/** La preuve est valide et l'adresse Spark appartient bien à l'identité qui a signé. */
async function verify(event: Event, profile: PublicProfile) {
  const known = verified.get(event.id);
  if (known !== undefined) return known;
  const proof = (JSON.parse(event.content) as { proof: string }).proof;
  const ok = await Promise.all([
    checkWalletSignature(proofMessage(profile.pubkey), profile.identity, proof),
    describeDestination(profile.address).then((d) => d.identityPublicKey === profile.identity),
  ])
    .then(([signed, owns]) => signed && owns)
    .catch(() => false);
  verified.set(event.id, ok);
  return ok;
}

/** Profils vérifiés correspondant au filtre : la dernière version de chaque auteur. */
async function findProfiles(filter: { '#i'?: string[]; authors?: string[] }) {
  const base = { kinds: [PROFILE_KIND], '#d': [PROFILE_D] };
  let events = await query([{ ...base, ...filter }]);
  // Recherche par numéro ou identité : un relais en retard peut encore servir une ancienne version
  // (profil retiré, numéro changé). On relit la dernière version de chaque auteur trouvé.
  if (filter['#i'] && events.length > 0) {
    const authors = [...new Set(events.map((e) => e.pubkey))];
    events = [...events, ...(await query([{ ...base, authors }]))];
  }
  const latest = new Map<string, Event>();
  for (const e of events) {
    const prev = latest.get(e.pubkey);
    if (!prev || e.created_at > prev.created_at) latest.set(e.pubkey, e);
  }
  const profiles = await Promise.all(
    [...latest.values()].map(async (e) => {
      const p = parseProfile(e);
      return p && (await verify(e, p)) ? p : null;
    }),
  );
  return profiles.filter((p): p is PublicProfile => !!p);
}

/** Le portefeuille Zafy lié à ce numéro (« +221771234567 »). Lève `RelayError` sans connexion. */
export async function lookupPhone(phone: string): Promise<PhoneLookup> {
  const hash = await phoneHash(phone);
  const profiles = (await findProfiles({ '#i': [`phonehash:${hash}`] })).filter((p) => p.phoneHash === hash);
  // Un même portefeuille peut avoir publié depuis plusieurs téléphones : on compte les identités
  const identities = new Set(profiles.map((p) => p.identity));
  if (identities.size === 0) return { status: 'none' };
  if (identities.size > 1) return { status: 'contested', profiles };
  const profile = profiles.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  return { status: 'found', profile };
}

/** Profils publiés par ce portefeuille Spark. */
export const profilesOfIdentity = async (identity: string) =>
  (await findProfiles({ '#i': [`sparkid:${identity}`] })).filter((p) => p.identity === identity);

/** Profils vérifiés de ces clés Nostr (ex. les auteurs de signalements). */
export async function profilesOfAuthors(pubkeys: string[]) {
  if (pubkeys.length === 0) return [];
  return findProfiles({ authors: pubkeys.slice(0, 200) });
}
