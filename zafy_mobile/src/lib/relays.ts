import { getRandomValues } from 'expo-crypto';
import type { Filter } from 'nostr-tools/filter';
import { privateKeyFromSeedWords } from 'nostr-tools/nip06';
import { SimplePool } from 'nostr-tools/pool';
import { finalizeEvent, getPublicKey, type Event, type EventTemplate } from 'nostr-tools/pure';

import { t } from '@/i18n';
import { loadMnemonic } from '@/lib/account';

// Les signatures Nostr ont besoin d'aléa : Hermes n'a pas `crypto.getRandomValues`.
if (typeof globalThis.crypto?.getRandomValues !== 'function') {
  Object.assign(globalThis, { crypto: { ...globalThis.crypto, getRandomValues } });
}

/** Relais publics où Zafy publie et lit (signalements, profils). */
const RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'];
const CONNECT_MS = 3000;
const WAIT_MS = 4000;

/** Aucun relais n'a répondu : on ne sait rien (à ne jamais confondre avec « aucun résultat »). */
export class RelayError extends Error {
  constructor() {
    super(t('errors.relayOffline'));
    this.name = 'RelayError';
  }
}

const pool = new SimplePool();
let secretKey: Uint8Array | null = null;

/** Clé Nostr tirée des 12 mots (NIP-06) : la même après une restauration du portefeuille. */
async function getSecretKey() {
  if (secretKey) return secretKey;
  const mnemonic = await loadMnemonic();
  if (!mnemonic) throw new Error(t('report.walletMissing'));
  secretKey = privateKeyFromSeedWords(mnemonic);
  return secretKey;
}

/** À appeler quand le compte change (déconnexion, restauration avec d'autres mots). */
export function forgetNostrKey() {
  secretKey = null;
}

/** Clé publique Nostr de l'utilisateur. */
export const myPubkey = async () => getPublicKey(await getSecretKey());

/** Signe et publie un événement : réussi dès qu'un relais l'accepte, sinon `RelayError`. */
export async function publish(template: Omit<EventTemplate, 'created_at'>) {
  const event = finalizeEvent({ ...template, created_at: Math.floor(Date.now() / 1000) }, await getSecretKey());
  await Promise.any(pool.publish(RELAYS, event, { maxWait: WAIT_MS })).catch(() => {
    throw new RelayError();
  });
  return event;
}

/**
 * Événements correspondant aux filtres, sur tous les relais.
 * Lève `RelayError` si aucun relais n'a vraiment répondu : une liste vide veut alors dire
 * « rien trouvé », jamais « pas de connexion ». Les signatures sont vérifiées par le pool.
 */
export async function query(filters: Filter[]): Promise<Event[]> {
  const events = new Map<string, Event>();
  const answered = await Promise.all(RELAYS.map((url) => queryRelay(url, filters, events)));
  if (!answered.includes(true)) throw new RelayError();
  return [...events.values()];
}

/** `true` seulement si le relais a envoyé sa fin de résultats (EOSE) à temps. */
async function queryRelay(url: string, filters: Filter[], events: Map<string, Event>) {
  try {
    const relay = await pool.ensureRelay(url, { connectionTimeout: CONNECT_MS });
    return await new Promise<boolean>((resolve) => {
      let done = false;
      let sub: { close: () => void } | null = null;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        sub?.close();
        resolve(ok);
      };
      // Notre propre délai : celui de nostr-tools ferait passer un relais muet pour une réponse vide
      const timer = setTimeout(() => finish(false), WAIT_MS);
      sub = relay.subscribe(filters, {
        eoseTimeout: WAIT_MS * 10,
        onevent: (event) => events.set(event.id, event),
        oneose: () => finish(true),
        onclose: () => finish(false),
      });
    });
  } catch {
    return false;
  }
}
