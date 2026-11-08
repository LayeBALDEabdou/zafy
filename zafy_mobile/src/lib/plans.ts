import { File, Paths } from 'expo-file-system';
import * as Notifications from 'expo-notifications';

import { t } from '@/i18n';
import { formatValue, toSats, type FiatAmount } from '@/lib/currency';
import { CHANNELS } from '@/lib/notifications';
import { formatShortDate, weekdayName } from '@/utils/date';

export type Frequency = 'once' | 'weekly' | 'monthly';

export type Plan = {
  id: string;
  /** « Loyer », « Maman »… */
  name: string;
  /** Adresse réutilisable (Spark) : une facture Lightning ne sert qu'une fois. */
  destination: string;
  /** Montant en sats au moment de la création (ou de la dernière modification). */
  amountSats: number;
  /**
   * Montant fixé dans une monnaie (ex. loyer de 50 000 FCFA) : converti en sats au taux du jour
   * à chaque paiement. Absent si le montant a été saisi en sats.
   */
  fiat?: FiatAmount;
  frequency: Frequency;
  /** Prochaine échéance (ISO). */
  nextDate: string;
  /** Jour du mois choisi au départ (mensuel) : le 31 reste le 31 quand le mois le permet. */
  anchorDay: number;
  notificationId?: string;
};

export type PlanInput = Omit<Plan, 'id' | 'notificationId' | 'anchorDay'>;



const file = () => new File(Paths.document, 'paiements-planifies.json');

// --- Stockage (fichier JSON sur le téléphone) ---

export async function loadPlans(): Promise<Plan[]> {
  const f = file();
  if (!f.exists) return [];
  try {
    const plans = JSON.parse(await f.text()) as Plan[];
    return plans.sort((a, b) => a.nextDate.localeCompare(b.nextDate));
  } catch {
    return [];
  }
}

async function savePlans(plans: Plan[]) {
  const f = file();
  if (!f.exists) f.create();
  await f.write(JSON.stringify(plans));
}

export async function getPlan(id: string) {
  return (await loadPlans()).find((p) => p.id === id) ?? null;
}

// --- Dates ---

/** Le jour choisi, à l'heure choisie. */
export function atTime(day: Date, hours: number, minutes: number) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0);
}

/** « 9:05 » ou « 0905 » → { hours: 9, minutes: 5 } ; null si l'heure est invalide. */
export function parseTime(text: string) {
  const digits = text.replace(/\D/g, '');
  if (digits.length < 3) return null;
  const hours = Number(digits.slice(0, -2));
  const minutes = Number(digits.slice(-2));
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/** « 9 h », « 14 h 30 » (« 9:00 », « 14:30 » en anglais). */
export function formatPlanTime(d: Date) {
  const m = d.getMinutes();
  return m ? t('dates.timeMinutes', { h: d.getHours(), m: String(m).padStart(2, '0') }) : t('dates.time', { h: d.getHours() });
}

/** Échéance suivante, à la même heure : +7 jours, ou même jour le mois suivant (le 31 → dernier jour du mois). */
function following(date: Date, frequency: Frequency, dayOfMonth: number) {
  const [h, min] = [date.getHours(), date.getMinutes()];
  if (frequency === 'weekly') return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7, h, min);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 2, 0).getDate();
  return new Date(date.getFullYear(), date.getMonth() + 1, Math.min(dayOfMonth, lastDay), h, min);
}

/** Montant à envoyer maintenant, en sats : recalculé au taux du jour si le montant est fixé en monnaie. */
export const planSats = (plan: Plan) => (plan.fiat ? toSats(plan.fiat.amount, plan.fiat.currency) : plan.amountSats);

/** « 50 000 FCFA » ou « 5 000 sats » : le montant tel qu'il a été choisi. */
const planAmountLabel = (plan: Plan) =>
  plan.fiat ? formatValue(plan.fiat.amount, plan.fiat.currency) : `${plan.amountSats.toLocaleString('fr-FR')} sats`;

export const isPast = (date: Date) => date.getTime() <= Date.now();

export const isDue = (plan: Plan) => isPast(new Date(plan.nextDate));

/** « Une fois · 15 nov. à 9 h », « Chaque lundi à 14 h 30 », « Chaque mois · le 5 à 9 h ». */
export function describeSchedule(plan: Pick<Plan, 'frequency' | 'nextDate'>) {
  const d = new Date(plan.nextDate);
  const time = formatPlanTime(d);
  if (plan.frequency === 'weekly') return t('plans.scheduleWeekly', { day: weekdayName(d.getDay()), time });
  if (plan.frequency === 'monthly') {
    return t('plans.scheduleMonthly', { day: d.getDate() === 1 ? t('plans.firstDay') : d.getDate(), time });
  }
  return t('plans.scheduleOnce', { date: formatShortDate(d), time });
}

// --- Rappels (notifications locales) ---

async function scheduleReminder(plan: Plan) {
  const date = new Date(plan.nextDate);
  if (date.getTime() <= Date.now()) return undefined;
  return Notifications.scheduleNotificationAsync({
    // Rappel seulement : l'envoi est toujours confirmé par l'utilisateur
    content: {
      title: t('plans.reminderTitle', { name: plan.name }),
      body: t('plans.reminderBody', { amount: planAmountLabel(plan) }),
      data: { planId: plan.id },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNELS.plans.id },
  });
}

async function cancelReminder(plan: Plan) {
  if (plan.notificationId) await Notifications.cancelScheduledNotificationAsync(plan.notificationId).catch(() => {});
}

// --- Actions ---

export async function createPlan(input: PlanInput) {
  const plan: Plan = { ...input, id: `${Date.now()}`, anchorDay: new Date(input.nextDate).getDate() };
  plan.notificationId = await scheduleReminder(plan);
  await savePlans([...(await loadPlans()), plan]);
  return plan;
}

/** Modifie un paiement : le rappel est reprogrammé pour la nouvelle date. */
export async function updatePlan(id: string, input: PlanInput) {
  const plans = await loadPlans();
  const plan = plans.find((p) => p.id === id);
  if (!plan) throw new Error(t('errors.planGone'));
  await cancelReminder(plan);
  const updated: Plan = { ...input, id, anchorDay: new Date(input.nextDate).getDate() };
  updated.notificationId = await scheduleReminder(updated);
  await savePlans(plans.map((p) => (p.id === id ? updated : p)));
  return updated;
}

export async function deletePlan(id: string) {
  const plans = await loadPlans();
  const plan = plans.find((p) => p.id === id);
  if (plan) await cancelReminder(plan);
  await savePlans(plans.filter((p) => p.id !== id));
}

/**
 * Après un envoi (ou si on saute l'échéance) : passe à la date suivante.
 * Un paiement « une fois » est supprimé.
 */
export async function advancePlan(id: string) {
  const plans = await loadPlans();
  const plan = plans.find((p) => p.id === id);
  if (!plan) return;
  await cancelReminder(plan);
  if (plan.frequency === 'once') return savePlans(plans.filter((p) => p.id !== id));

  let next = following(new Date(plan.nextDate), plan.frequency, plan.anchorDay);
  // Échéances manquées : on rattrape jusqu'à la prochaine date future
  while (next.getTime() <= Date.now()) next = following(next, plan.frequency, plan.anchorDay);

  const updated: Plan = { ...plan, nextDate: next.toISOString() };
  updated.notificationId = await scheduleReminder(updated);
  await savePlans(plans.map((p) => (p.id === id ? updated : p)));
}
