import { t } from '@/i18n';
import { prepareSend, sendPrepared } from '@/lib/breez';
import { formatMoney } from '@/lib/currency';
import { notifyNow } from '@/lib/notifications';
import { advancePlan, getPlan, isDue, loadPlans, planSats } from '@/lib/plans';

let running = false;
/** Échecs déjà signalés : pas de nouvelle tentative (ni notification) toutes les minutes. */
const failed = new Set<string>();
/** Paiements en cours d'envoi (automatique ou manuel) : jamais deux envois pour la même échéance. */
const inFlight = new Set<string>();
const listeners = new Set<() => void>();

/** Réserve un paiement le temps de l'envoyer. Renvoie false s'il est déjà en cours d'envoi. */
export function claimPlan(id: string) {
  if (inFlight.has(id)) return false;
  inFlight.add(id);
  return true;
}

export const releasePlan = (id: string) => inFlight.delete(id);

export const hasAutoPayFailed = (id: string) => failed.has(id);

/** Prévient quand un passage a envoyé un paiement ou constaté un échec. */
export function onAutoPayments(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Envoie les paiements planifiés « automatiques » arrivés à échéance.
 * Les clés restent sur le téléphone : ça ne tourne que quand le wallet est ouvert.
 * En cas d'échec, le paiement reste « À payer » ; il est retenté quand l'app revient au premier plan (`retry`).
 */
export async function runAutoPayments(retry = false) {
  if (running) return;
  running = true;
  if (retry) failed.clear();
  let changed = false;
  try {
    const due = (await loadPlans()).filter((p) => p.autoSend && isDue(p) && !failed.has(p.id));
    for (const plan of due) {
      if (!claimPlan(plan.id)) continue;
      try {
        // Relu juste avant l'envoi : il a pu être payé ou supprimé entre-temps
        const fresh = await getPlan(plan.id);
        if (!fresh || fresh.nextDate !== plan.nextDate) continue;
        const prepared = await prepareSend(plan.destination, planSats(plan));
        await sendPrepared(prepared);
        await advancePlan(plan.id);
        changed = true;
        await notifyNow(
          'plans',
          t('plans.autoSentTitle', { name: plan.name }),
          t('plans.autoSentBody', { amount: formatMoney(prepared.amountSats) }),
        ).catch(() => {});
      } catch {
        failed.add(plan.id);
        changed = true;
        await notifyNow(
          'plans',
          t('plans.autoFailedTitle', { name: plan.name }),
          t('plans.autoFailedBody'),
        ).catch(() => {});
      } finally {
        releasePlan(plan.id);
      }
    }
  } finally {
    running = false;
  }
  if (changed) listeners.forEach((fn) => fn());
}
