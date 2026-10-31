import { getRandomValues } from 'expo-crypto';
import { finalizeEvent, type Event } from 'nostr-tools/pure';
import { privateKeyFromSeedWords } from 'nostr-tools/nip06';
import { SimplePool } from 'nostr-tools/pool';

import { t } from '@/i18n';
import { loadMnemonic } from '@/lib/account';
import { describeDestination } from '@/lib/breez';
import { colors } from '@/theme';

// Les signatures Nostr ont besoin d'aléa : Hermes n'a pas `crypto.getRandomValues`.
if (typeof globalThis.crypto?.getRandomValues !== 'function') {
  Object.assign(globalThis, { crypto: { ...globalThis.crypto, getRandomValues } });
}

/** Relais publics où sont publiés et lus les signalements. */
const RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'];

/** Signalement (NIP-56) avec une étiquette `i` = ce qui est signalé, et `t` = zafy. */
const REPORT_KIND = 1984;
const APP_TAG = 'zafy';
const LABEL_NAMESPACE = 'app.zafy.report';
const WAIT_MS = 4000;

export const REPORT_TYPES = [
  { slug: 'faux-agent', label: 'report.typeFakeAgent' },
  { slug: 'faux-vendeur', label: 'report.typeFakeSeller' },
  { slug: 'code-piege', label: 'report.typeTrapCode' },
  { slug: 'faux-lien', label: 'report.typeFakeLink' },
  { slug: 'envoi-erreur', label: 'report.typeWrongSend' },
  { slug: 'autre', label: 'report.typeOther' },
] as const;

export type ReportType = (typeof REPORT_TYPES)[number]['slug'];

export const reportTypeLabel = (slug: string) => t(REPORT_TYPES.find((r) => r.slug === slug)?.label ?? 'report.typeScam');

export type Report = {
  id: string;
  /** Clé Nostr de la personne qui signale (jamais son nom ni son numéro). */
  author: string;
  /** Ce qui est signalé, ex. « phone:+221771234567 », « spark:sparkrt1… ». */
  target: string;
  type: string;
  message: string;
  createdAt: Date;
};

/** Signalements regroupés par numéro / adresse. */
export type ReportSummary = {
  target: string;
  /** Nombre de personnes différentes (plusieurs signalements d'une même personne comptent pour un). */
  count: number;
  /** Types signalés, du plus fréquent au moins fréquent. */
  types: string[];
  messages: string[];
  first: Date;
  last: Date;
};

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

// --- Ce qu'on signale ---

const PHONE = /^\+?[\d\s.-]{8,}$/;
const TARGET = /^(phone|sparkid|spark|bitcoin|node):/;

/** « 77 412 08 12 » → « +221774120812 » (numéro sénégalais par défaut). */
export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, '');
  if (input.trim().startsWith('+')) return `+${digits}`;
  if (digits.length === 9) return `+221${digits}`;
  return `+${digits.replace(/^00/, '')}`;
}

/**
 * Transforme ce que l'utilisateur a saisi en cible de signalement :
 * numéro de téléphone, compte Spark (adresse ou facture Spark), adresse Bitcoin, ou nœud qui encaisse une facture Lightning.
 */
export async function resolveTarget(input: string): Promise<string | null> {
  const value = input.trim();
  if (!value) return null;
  // Déjà une cible (ex. « Moi aussi » depuis une alerte)
  if (TARGET.test(value)) return value;
  if (PHONE.test(value)) return `phone:${normalizePhone(value)}`;
  const dest = await describeDestination(value).catch(() => null);
  switch (dest?.kind) {
    case 'spark':
    case 'sparkInvoice':
      // Identité Spark : la même pour l'adresse et les factures d'une personne
      return dest.identityPublicKey ? `sparkid:${dest.identityPublicKey}` : `spark:${value.toLowerCase()}`;
    case 'bitcoin':
      return `bitcoin:${value}`;
    case 'invoice':
      // Une facture ne sert qu'une fois : on signale le nœud qui l'encaisse
      return dest.payeePubkey ? `node:${dest.payeePubkey}` : null;
    default:
      return null;
  }
}

const shorten = (s: string) => (s.length > 22 ? `${s.slice(0, 10)}…${s.slice(-6)}` : s);

/** Texte lisible : « +221 77 412 08 12 », « Adresse sparkrt1q…x8k2 »… */
export function formatTarget(target: string) {
  const [kind, ...rest] = target.split(':');
  const value = rest.join(':');
  if (kind === 'phone') {
    const m = value.match(/^\+221(\d{2})(\d{3})(\d{2})(\d{2})$/);
    return m ? `+221 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : value;
  }
  if (kind === 'node') return t('report.node', { id: shorten(value) });
  if (kind === 'sparkid') return t('report.account', { id: shorten(value) });
  return shorten(value);
}

/** Couleur selon le nombre de personnes qui ont signalé. */
export function reportTone(count: number) {
  if (count >= 5) return { tone: 'danger', dot: colors.dangerDot } as const;
  if (count >= 2) return { tone: 'warning', dot: colors.warning } as const;
  return { tone: 'neutral', dot: colors.textSecondary } as const;
}

/** Texte à mettre dans le champ de saisie pour signaler à nouveau une cible. */
export function targetToInput(target: string) {
  if (target.startsWith('phone:')) return formatTarget(target);
  if (target.startsWith('spark:') || target.startsWith('bitcoin:')) return target.slice(target.indexOf(':') + 1);
  return target;
}

export const isPhoneTarget = (target: string) => target.startsWith('phone:');

// --- Publication ---

export async function publishReport({ target, type, message }: { target: string; type: ReportType; message: string }) {
  const event = finalizeEvent(
    {
      kind: REPORT_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['i', target],
        ['t', APP_TAG],
        ['L', LABEL_NAMESPACE],
        ['l', type, LABEL_NAMESPACE],
      ],
      content: message.trim(),
    },
    await getSecretKey(),
  );
  // Réussi dès qu'un relais l'accepte
  await Promise.any(pool.publish(RELAYS, event, { maxWait: WAIT_MS })).catch(() => {
    throw new Error(t('report.relayRejected'));
  });
}

// --- Lecture ---

function toReport(event: Event): Report | null {
  const tag = (name: string) => event.tags.find((t) => t[0] === name)?.[1];
  const target = tag('i');
  if (!target || !event.tags.some((t) => t[0] === 't' && t[1] === APP_TAG)) return null;
  return {
    id: event.id,
    author: event.pubkey,
    target,
    type: event.tags.find((t) => t[0] === 'l' && t[2] === LABEL_NAMESPACE)?.[1] ?? 'autre',
    message: event.content,
    createdAt: new Date(event.created_at * 1000),
  };
}

/** Tous les signalements d'un numéro ou d'une adresse. */
export async function reportsFor(target: string) {
  const events = await pool.querySync(RELAYS, { kinds: [REPORT_KIND], '#i': [target] }, { maxWait: WAIT_MS });
  return summarize(events.map(toReport).filter((r): r is Report => !!r))[0] ?? null;
}

/** Signalements visant l'une de ces cibles (ex. le numéro et l'adresse de l'utilisateur), une ligne par cible. */
export async function reportsAgainst(targets: string[]) {
  if (targets.length === 0) return [];
  const events = await pool.querySync(RELAYS, { kinds: [REPORT_KIND], '#i': targets }, { maxWait: WAIT_MS });
  return summarize(events.map(toReport).filter((r): r is Report => !!r));
}

/** Signalements Zafy récents (30 jours par défaut), regroupés et triés du plus signalé au moins signalé. */
export async function recentReports(days = 30) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const events = await pool.querySync(
    RELAYS,
    { kinds: [REPORT_KIND], '#t': [APP_TAG], since, limit: 500 },
    { maxWait: WAIT_MS },
  );
  const reports = events.map(toReport).filter((r): r is Report => !!r);
  return { reports, summaries: summarize(reports) };
}

function summarize(reports: Report[]): ReportSummary[] {
  const byTarget = new Map<string, Report[]>();
  // Un même événement peut revenir de plusieurs relais
  const unique = [...new Map(reports.map((r) => [r.id, r])).values()];
  for (const r of unique) byTarget.set(r.target, [...(byTarget.get(r.target) ?? []), r]);

  return [...byTarget.entries()]
    .map(([target, list]) => {
      const typeCounts = new Map<string, number>();
      for (const r of list) typeCounts.set(r.type, (typeCounts.get(r.type) ?? 0) + 1);
      const times = list.map((r) => r.createdAt.getTime());
      return {
        target,
        count: new Set(list.map((r) => r.author)).size,
        types: [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t),
        messages: list
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((r) => r.message)
          .filter(Boolean),
        first: new Date(Math.min(...times)),
        last: new Date(Math.max(...times)),
      };
    })
    .sort((a, b) => b.count - a.count || b.last.getTime() - a.last.getTime());
}
