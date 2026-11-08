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

/**
 * Relais publics où Zafy publie et lit (signalements, profils).
 * Plusieurs relais : chacun peut être lent, injoignable ou refuser de garder un événement.
 */
const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://nostr.mom',
  'wss://relay.snort.social',
];
/** Certains relais mettent plusieurs secondes à accepter la connexion (réseau mobile). */
const CONNECT_MS = 6000;
const WAIT_MS = 6000;
/**
 * Pour conclure « rien trouvé », il faut que ce nombre de relais aient vraiment répondu :
 * un seul relais rapide qui n'a pas l'événement ne doit pas faire croire qu'il n'existe pas.
 */
const MIN_ANSWERS = 2;

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
  // Ce qui vient d'être publié doit apparaître tout de suite : on oublie les résultats en mémoire
  cache.clear();
  return event;
}

// --- Lecture ---

/** Une fois assez de relais répondus, on laisse encore ce délai aux autres, puis on répond. */
const GRACE_MS = 600;
/** Résultats gardés en mémoire : rouvrir un écran ne relance pas la même recherche. */
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; events: Event[] }>();
/** Même recherche déjà en cours : on attend son résultat au lieu d'en lancer une seconde. */
const pending = new Map<string, Promise<Event[]>>();

/**
 * Événements correspondant aux filtres, sur tous les relais (signatures vérifiées par le pool).
 * Rapide : on répond dès que `MIN_ANSWERS` relais ont fini (plus une courte attente pour les autres),
 * sans attendre un relais lent ou injoignable.
 * - Des événements trouvés suffisent, même si un seul relais a répondu à la fin du délai.
 * - Une liste vide n'est renvoyée que si au moins `MIN_ANSWERS` relais ont vraiment répondu :
 *   elle veut alors dire « rien trouvé ». Sinon `RelayError` (« vérification impossible »).
 */
export async function query(filters: Filter[]): Promise<Event[]> {
  const key = JSON.stringify(filters);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.events;
  const running = pending.get(key);
  if (running) return running;

  const request = runQuery(filters)
    .then((events) => {
      cache.set(key, { at: Date.now(), events });
      return events;
    })
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

function runQuery(filters: Filter[]): Promise<Event[]> {
  return new Promise((resolve, reject) => {
    const events = new Map<string, Event>();
    const subs: { close: () => void }[] = [];
    const quorum = Math.min(MIN_ANSWERS, RELAYS.length);
    let answered = 0;
    let finished = 0;
    let done = false;
    let grace: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(deadline);
      if (grace) clearTimeout(grace);
      subs.forEach((sub) => sub.close());
      if (events.size === 0 && answered < quorum) reject(new RelayError());
      else resolve([...events.values()]);
    };
    // Délai total : un relais muet ne bloque jamais la réponse plus longtemps
    const deadline = setTimeout(finish, CONNECT_MS + WAIT_MS / 2);

    const settle = (ok: boolean) => {
      if (done) return;
      finished += 1;
      if (ok) answered += 1;
      if (finished === RELAYS.length) return finish();
      if (answered === quorum && !grace) grace = setTimeout(finish, GRACE_MS);
    };

    for (const url of RELAYS) {
      pool
        .ensureRelay(url, { connectionTimeout: CONNECT_MS })
        .then((relay) => {
          if (done) return;
          let settled = false;
          const once = (ok: boolean) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            settle(ok);
          };
          // Notre propre délai : celui de nostr-tools ferait passer un relais muet pour une réponse vide
          const timer = setTimeout(() => once(false), WAIT_MS);
          const sub = relay.subscribe(filters, {
            eoseTimeout: WAIT_MS * 10,
            onevent: (event) => events.set(event.id, event),
            oneose: () => once(true),
            onclose: () => once(false),
          });
          subs.push(sub);
        })
        .catch(() => settle(false));
    }
  });
}
