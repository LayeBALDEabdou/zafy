import type { Transaction } from '@/data/mock';
import { t } from '@/i18n';
import { formatMoney } from '@/lib/currency';

/** Titre d'une transaction : le texte de la facture, sinon le type de paiement traduit. */
export const txTitle = (tx: Transaction) => tx.description ?? t(`tx.${tx.method}`);

/** Statut et frais : « En attente · frais 12 FCFA ». Vide s'il n'y a rien à signaler. */
export function txNote(tx: Transaction) {
  return [tx.status ? t(`tx.${tx.status}`) : null, tx.feeSats > 0 ? t('tx.fee', { amount: formatMoney(tx.feeSats) }) : null]
    .filter(Boolean)
    .join(' · ');
}
