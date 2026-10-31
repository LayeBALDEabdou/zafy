import { t } from '@/i18n';

export const DAY_MS = 24 * 3_600_000;

/** Noms traduits, dans la langue choisie (« janv. » / « Jan »). */
const list = (key: 'dates.monthsShort' | 'dates.monthsLong' | 'dates.weekdaysShort' | 'dates.weekdays') =>
  t(key).split(',');

export const monthLong = (month: number) => list('dates.monthsLong')[month];
/** Initiales des jours, du lundi au dimanche (calendrier). */
export const weekdayInitials = () => list('dates.weekdaysShort');
/** Nom du jour (0 = dimanche), en minuscules en français. */
export const weekdayName = (day: number) => list('dates.weekdays')[day];

/** Minuit (heure locale) du jour de `d`. */
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Dernière milliseconde du jour de `d`. */
export const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, -1);

export const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

/** Nombre de jours depuis le début de la journée de `d` (0 = aujourd'hui). */
export const daysAgo = (d: Date) => Math.round((startOfDay(new Date()).getTime() - startOfDay(d).getTime()) / DAY_MS);

/** « 28 oct. » (« Oct 28 »), avec l'année hors de l'année en cours. */
export function formatShortDate(d: Date) {
  const params = { day: d.getDate(), month: list('dates.monthsShort')[d.getMonth()], year: d.getFullYear() };
  return d.getFullYear() === new Date().getFullYear() ? t('dates.dayMonth', params) : t('dates.dayMonthYear', params);
}

/** « Aujourd'hui », « Hier » ou la date courte. */
export function formatDay(d: Date) {
  const diff = daysAgo(d);
  if (diff === 0) return t('dates.today');
  if (diff === 1) return t('dates.yesterday');
  return formatShortDate(d);
}

export const formatTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** « à l'instant », « il y a 12 min », « il y a 3 h », puis « Hier » ou la date courte. */
export function formatAgo(d: Date) {
  const minutes = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (minutes < 1) return t('dates.justNow');
  if (minutes < 60) return t('dates.minutesAgo', { n: minutes });
  if (minutes < 24 * 60 && isSameDay(d, new Date())) return t('dates.hoursAgo', { n: Math.floor(minutes / 60) });
  return formatDay(d);
}
