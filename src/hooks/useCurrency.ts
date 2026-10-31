import { useEffect, useSyncExternalStore } from 'react';

import {
  CURRENCIES,
  formatIn,
  formatInput,
  formatValue,
  getCurrencyState,
  hasDecimals,
  inputFromSats,
  parseInput,
  QUICK_AMOUNTS,
  refreshPrices,
  setCurrency,
  subscribeCurrency,
  toSats,
  type Currency,
  type FiatAmount,
} from '@/lib/currency';

/**
 * Devise choisie dans le Profil et fonctions d'affichage.
 * `format` : montant dans la devise choisie. `secondary` : l'équivalent à afficher en petit
 * (en sats si la devise est une monnaie, en FCFA si c'est le sat).
 */
export function useCurrency() {
  const { currency, prices, updatedAt } = useSyncExternalStore(subscribeCurrency, getCurrencyState, getCurrencyState);

  // Taux à jour quand un écran qui affiche des montants s'ouvre
  useEffect(() => {
    refreshPrices().catch(() => {});
  }, []);

  const secondaryCurrency: Currency = currency === 'SAT' ? 'XOF' : 'SAT';
  return {
    currency,
    updatedAt,
    setCurrency,
    format: (sats: number) => formatIn(sats, currency, prices),
    /** Montant fixé dans une monnaie : affiché tel quel s'il est dans la devise choisie, sinon converti. */
    formatFixed: (sats: number, fiat?: FiatAmount) =>
      fiat && fiat.currency === currency ? formatValue(fiat.amount, fiat.currency) : formatIn(sats, currency, prices),
    secondary: (sats: number) => formatIn(sats, secondaryCurrency, prices),
    secondaryCurrency,
    // --- Saisie dans la devise choisie ---
    /** Unité affichée à côté du champ (« FCFA », « € », « $ », « sats »). */
    unit: CURRENCIES.find((c) => c.code === currency)?.symbol ?? 'sats',
    decimals: hasDecimals(currency),
    /** Texte saisi → montant en sats. */
    inputToSats: (text: string) => toSats(parseInput(text, currency), currency, prices),
    /** Texte saisi → montant fixé en monnaie (rien si la devise est le sat). */
    inputToFiat: (text: string): FiatAmount | undefined =>
      currency === 'SAT' ? undefined : { currency, amount: parseInput(text, currency) },
    /** Remise en forme pendant la frappe. */
    formatInput: (text: string) => formatInput(text, currency),
    /** Montant en sats → texte du champ. */
    inputFromSats: (sats: number) => inputFromSats(sats, currency, prices),
    quickAmounts: QUICK_AMOUNTS[currency],
    /** Équivalent affiché sous le champ : en sats, ou en FCFA si l'on saisit déjà en sats. */
    inputHint: (sats: number) => formatIn(sats, currency === 'SAT' ? 'XOF' : 'SAT', prices),
  };
}
