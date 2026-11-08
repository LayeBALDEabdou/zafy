import type { Event } from 'nostr-tools/pure';

import { t } from '@/i18n';
import { describeDestination } from '@/lib/breez';
import { lookupPhone, phoneHash, profilesOfAuthors, profilesOfIdentity } from '@/lib/directory';
import { isNormalizedPhone, parseZafyAddress } from '@/lib/phone';
import { myPubkey, publish, query } from '@/lib/relays';

export { normalizePhone } from '@/lib/phone';
export { RelayError } from '@/lib/relays';

/** Signalement (NIP-56) avec une étiquette `i` = ce qui est signalé, et `t` = zafy. */
const REPORT_KIND = 1984;
const DELETION_KIND = 5;
const APP_TAG = 'zafy';
const LABEL_NAMESPACE = 'app.zafy.report';
/** Longueur maximale du message joint (le reste est coupé, à l'écriture comme à la lecture). */
export const MAX_REPORT_MESSAGE = 280;

export const REPORT_TYPES = [
  { slug: 'faux-agent', label: 'report.typeFakeAgent' },
  { slug: 'faux-vendeur', label: 'report.typeFakeSeller' },
  { slug: 'code-piege', label: 'report.typeTrapCode' },
  { slug: 'faux-lien', label: 'report.typeFakeLink' },
  { slug: 'envoi-erreur', label: 'report.typeWrongSend' },
  { slug: 'autre', label: 'report.typeOther' },
] as const;

export type ReportType = (typeof REPORT_TYPES)[number]['slug'];

const isReportType = (slug: string): slug is ReportType => REPORT_TYPES.some((r) => r.slug === slug);

export const reportTypeLabel = (slug: string) => t(REPORT_TYPES.find((r) => r.slug === slug)?.label ?? 'report.typeScam');

export type Report = {
  id: string;
  /** Clé Nostr de la personne qui signale (jamais son nom ni son numéro). */
  author: string;
  /** Ce qui est signalé, ex. « phone:+221771234567 », « sparkid:02ab… ». */
  target: string;
  type: string;
  message: string;
  createdAt: Date;
  /** Empreinte du numéro signalé (étiquette `phonehash:`), le cas échéant. */
  phoneHash?: string;
};

/** Signalements regroupés par numéro / adresse. */
export type ReportSummary = {
  target: string;
  /** Nombre de personnes différentes (plusieurs signalements d'une même personne comptent pour un). */
  count: number;
  /** Clés Nostr des personnes qui ont signalé. */
  authors: string[];
  /** Types signalés, du plus fréquent au moins fréquent. */
  types: string[];
  messages: string[];
  first: Date;
  last: Date;
};

/** Résultat détaillé pour une cible : regroupe aussi le compte Zafy lié au numéro (et inversement). */
export type TargetReports = ReportSummary & {
  /** L'utilisateur a lui-même signalé cette cible. */
  mine: boolean;
  /** Parmi les personnes qui ont signalé, combien sont dans les contacts de l'utilisateur. */
  fromContacts: number;
  /** Autres cibles liées dont des signalements ont été comptés (ex. le compte Zafy de ce numéro). */
  linked: string[];
};

// --- Ce qu'on signale ---

const TARGET = /^(phone|sparkid|spark|bitcoin|node):/;
const PUBKEY = /^[0-9a-f]{64,66}$/;

/** Cible bien formée : on n'accepte rien d'autre, ni à la publication ni à la lecture. */
export function isValidTarget(target: string) {
  const i = target.indexOf(':');
  const kind = target.slice(0, i);
  const value = target.slice(i + 1);
  switch (kind) {
    case 'phone':
      return isNormalizedPhone(value);
    case 'sparkid':
    case 'node':
      return PUBKEY.test(value);
    case 'spark':
      return /^spark[a-z0-9]{20,}$/.test(value);
    case 'bitcoin':
      return /^[a-zA-Z0-9]{25,90}$/.test(value);
    default:
      return false;
  }
}

/** Adresse Bitcoin bech32 (bc1…, tb1…, bcrt1…) : insensible à la casse, on la garde en minuscules. */
const normalizeBitcoin = (address: string) => (/^(bc|tb|bcrt)1/i.test(address) ? address.toLowerCase() : address);

/**
 * Transforme ce que l'utilisateur a saisi en cible de signalement :
 * numéro de téléphone ou adresse Zafy, compte Spark (adresse ou facture Spark), adresse Bitcoin,
 * ou nœud qui encaisse une facture Lightning.
 */
export async function resolveTarget(input: string): Promise<string | null> {
  const value = input.trim();
  if (!value) return null;
  // Déjà une cible (ex. « Moi aussi » depuis une alerte) : vérifiée comme le reste
  if (TARGET.test(value)) {
    const [kind] = value.split(':');
    const target = kind === 'bitcoin' ? `bitcoin:${normalizeBitcoin(value.slice(8))}` : value;
    return isValidTarget(target) ? target : null;
  }
  // Numéro ou adresse Zafy (« a.balde.776511631@zafy ») : on signale le numéro,
  // et le compte Zafy qui lui est lié est compté avec lui (voir `reportsFor`)
  const zafy = parseZafyAddress(value);
  if (zafy) return `phone:${zafy.phone}`;
  const dest = await describeDestination(value).catch(() => null);
  let target: string | null = null;
  switch (dest?.kind) {
    case 'spark':
      // Identité Spark : la même pour l'adresse et les factures d'une personne
      target = dest.identityPublicKey ? `sparkid:${dest.identityPublicKey}` : `spark:${value.toLowerCase()}`;
      break;
    case 'sparkInvoice':
      // Une facture sans identité ne désigne personne de façon durable
      target = dest.identityPublicKey ? `sparkid:${dest.identityPublicKey}` : null;
      break;
    case 'bitcoin':
      target = `bitcoin:${normalizeBitcoin(value)}`;
      break;
    case 'invoice':
      // Une facture ne sert qu'une fois : on signale le nœud qui l'encaisse
      target = dest.payeePubkey ? `node:${dest.payeePubkey}` : null;
      break;
  }
  return target && isValidTarget(target) ? target : null;
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

/** Texte à mettre dans le champ de saisie pour signaler à nouveau une cible. */
export function targetToInput(target: string) {
  if (target.startsWith('phone:')) return formatTarget(target);
  if (target.startsWith('spark:') || target.startsWith('bitcoin:')) return target.slice(target.indexOf(':') + 1);
  return target;
}

export const isPhoneTarget = (target: string) => target.startsWith('phone:');

// --- Publication ---

export async function publishReport({ target, type, message }: { target: string; type: ReportType; message: string }) {
  if (!isValidTarget(target)) throw new Error(t('report.errUnknown'));
  if (!isReportType(type)) throw new Error(t('report.errType'));
  const tags = [
    ['i', target],
    ['t', APP_TAG],
    ['L', LABEL_NAMESPACE],
    ['l', type, LABEL_NAMESPACE],
  ];
  // Empreinte du numéro : permet de retrouver ce signalement depuis le compte Zafy lié à ce numéro
  if (isPhoneTarget(target)) tags.push(['i', `phonehash:${await phoneHash(target.slice('phone:'.length))}`]);
  await publish({ kind: REPORT_KIND, tags, content: message.trim().slice(0, MAX_REPORT_MESSAGE) });
}

/** Retire les signalements de l'utilisateur sur cette cible (demande de suppression NIP-09). */
export async function retractReport(target: string) {
  const me = await myPubkey();
  const events = await query([{ kinds: [REPORT_KIND], authors: [me], '#i': [target] }]);
  const ids = events.map(toReport).filter((r): r is Report => r?.target === target).map((r) => r.id);
  if (ids.length === 0) return;
  await publish({
    kind: DELETION_KIND,
    // `i` et `t` comme le signalement : la demande de suppression arrive dans la même requête que lui
    tags: [...ids.map((id) => ['e', id]), ['k', String(REPORT_KIND)], ['i', target], ['t', APP_TAG]],
    content: '',
  });
}

// --- Lecture ---

function toReport(event: Event): Report | null {
  if (!event.tags.some((t) => t[0] === 't' && t[1] === APP_TAG)) return null;
  // La cible est la première étiquette `i` (les suivantes sont des empreintes de numéro)
  const target = event.tags.find((t) => t[0] === 'i' && !t[1]?.startsWith('phonehash:'))?.[1];
  if (!target || !isValidTarget(target)) return null;
  const type = event.tags.find((t) => t[0] === 'l' && t[2] === LABEL_NAMESPACE)?.[1] ?? 'autre';
  const hash = event.tags.find((t) => t[0] === 'i' && t[1]?.startsWith('phonehash:'))?.[1];
  return {
    id: event.id,
    author: event.pubkey,
    target,
    type: isReportType(type) ? type : 'autre',
    message: event.content.trim().slice(0, MAX_REPORT_MESSAGE),
    createdAt: new Date(event.created_at * 1000),
    phoneHash: hash ? hash.slice('phonehash:'.length) : undefined,
  };
}

/**
 * Signalements correspondant au filtre, sans ceux que leur auteur a retirés. Lève `RelayError` sans connexion.
 * Une seule requête : les demandes de suppression portent les mêmes étiquettes que les signalements.
 */
async function fetchReports(filter: { '#i'?: string[]; '#t'?: string[]; since?: number; limit?: number }) {
  const { limit, ...tags } = filter;
  const events = await query([
    { kinds: [REPORT_KIND], ...filter },
    { kinds: [DELETION_KIND], ...tags },
  ]);
  // Seul l'auteur peut retirer son signalement
  const removed = new Set(
    events
      .filter((e) => e.kind === DELETION_KIND)
      .flatMap((d) => d.tags.filter((t) => t[0] === 'e').map((t) => `${d.pubkey}:${t[1]}`)),
  );
  return events
    .filter((e) => e.kind === REPORT_KIND)
    .map(toReport)
    .filter((r): r is Report => !!r && !removed.has(`${r.author}:${r.id}`));
}

/**
 * Cibles liées par l'annuaire Zafy : le compte Zafy d'un numéro, ou le numéro d'un compte Zafy.
 * Seulement si le lien est sûr (profil prouvé, numéro non contesté).
 */
async function linkedTargets(target: string): Promise<string[]> {
  if (target.startsWith('phone:')) {
    const found = await lookupPhone(target.slice('phone:'.length));
    return found.status === 'found' ? [`sparkid:${found.profile.identity}`] : [];
  }
  if (target.startsWith('sparkid:')) {
    const profiles = await profilesOfIdentity(target.slice('sparkid:'.length));
    return [...new Set(profiles.map((p) => `phonehash:${p.phoneHash}`))];
  }
  return [];
}

/**
 * Tous les signalements d'un numéro ou d'une adresse, y compris ceux du compte Zafy lié.
 * `null` = aucun signalement ; lève `RelayError` si les relais n'ont pas répondu.
 * `contactIdentities` : identités Spark des contacts, pour compter ceux qui ont signalé.
 */
export async function reportsFor(target: string, contactIdentities: string[] = []): Promise<TargetReports | null> {
  // En même temps : les signalements de la cible, et le compte lié suivi de ses signalements
  const [direct, { linked, reports: linkedReports }] = await Promise.all([
    fetchReports({ '#i': [target] }),
    linkedTargets(target)
      .catch((): string[] => [])
      .then(async (list) => ({
        linked: list,
        reports: list.length > 0 ? await fetchReports({ '#i': list }).catch((): Report[] => []) : [],
      })),
  ]);
  const reports = [...direct, ...linkedReports];
  if (reports.length === 0) return null;
  // On ne garde que ce qui vise vraiment la cible ou une cible liée (pas une étiquette ajoutée en plus)
  const relevant = reports.filter(
    (r) =>
      r.target === target ||
      linked.includes(r.target) ||
      (isPhoneTarget(r.target) && !!r.phoneHash && linked.includes(`phonehash:${r.phoneHash}`)),
  );
  const [summary] = summarize(relevant.map((r) => ({ ...r, target })));
  if (!summary) return null;

  const contacts = new Set(contactIdentities);
  const [me, reporters] = await Promise.all([
    myPubkey().catch(() => null),
    contacts.size > 0 ? profilesOfAuthors(summary.authors).catch(() => []) : Promise.resolve([]),
  ]);
  return {
    ...summary,
    mine: !!me && summary.authors.includes(me),
    fromContacts: new Set(reporters.filter((p) => contacts.has(p.identity)).map((p) => p.pubkey)).size,
    linked: [...new Set(relevant.map((r) => r.target).filter((t) => t !== target))],
  };
}

/** Signalements visant l'une de ces cibles (ex. le numéro et l'adresse de l'utilisateur), une ligne par cible. */
export async function reportsAgainst(targets: string[]) {
  if (targets.length === 0) return [];
  return summarize((await fetchReports({ '#i': targets })).filter((r) => targets.includes(r.target)));
}

/** Signalements Zafy récents (30 jours par défaut), regroupés et triés du plus signalé au moins signalé. */
export async function recentReports(days = 30) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const reports = await fetchReports({ '#t': [APP_TAG], since, limit: 500 });
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
      const authors = [...new Set(list.map((r) => r.author))];
      return {
        target,
        count: authors.length,
        authors,
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
