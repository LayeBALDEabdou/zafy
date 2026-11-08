import { File, Paths } from 'expo-file-system';

import { formatNumber } from '@/data/mock';
import { fetchBtcPrices } from '@/lib/breez';

/**
 * Devise d'affichage. Les montants restent en sats partout (saisie, envois) : seule la présentation change.
 * `SAT` sert seulement à l'affichage secondaire (« soit N sats ») : l'utilisateur ne peut pas le choisir.
 */
export type Currency = 'XOF' | 'USD' | 'EUR' | 'SAT';

/** Devises proposées à l'utilisateur. */
export const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: 'XOF', label: 'Franc CFA', symbol: 'FCFA' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'USD', label: 'Dollar', symbol: '$' },
];

const isChoosable = (currency: unknown): currency is Currency => CURRENCIES.some((c) => c.code === currency);

/** Prix d'un bitcoin dans chaque devise. */
type Prices = Record<Exclude<Currency, 'SAT'>, number>;

/** Le franc CFA est arrimé à l'euro : 1 € = 655,957 FCFA exactement. */
const XOF_PER_EUR = 655.957;
const SATS_PER_BTC = 100_000_000;
const REFRESH_MS = 5 * 60_000;
/** Valeurs de départ, avant le premier taux réel (≈ 0,45 FCFA par sat). */
const DEFAULT_PRICES: Prices = { XOF: 45_000_000, EUR: 45_000_000 / XOF_PER_EUR, USD: 77_000 };

type State = { currency: Currency; prices: Prices; updatedAt: number | null };

let state: State = { currency: 'XOF', prices: DEFAULT_PRICES, updatedAt: null };
const listeners = new Set<() => void>();

const file = () => new File(Paths.document, 'devise.json');

function update(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn());
  // Enregistré pour le prochain démarrage (et hors connexion)
  try {
    const f = file();
    if (!f.exists) f.create();
    f.write(JSON.stringify(state));
  } catch {
    // Aperçu web : pas de fichier, on garde en mémoire
  }
}

export const getCurrencyState = () => state;

export function subscribeCurrency(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export const setCurrency = (currency: Currency) => {
  if (isChoosable(currency)) update({ currency });
};

/** Relit la devise choisie et les derniers taux connus. */
export async function loadCurrency() {
  try {
    const f = file();
    if (f.exists) {
      const saved = JSON.parse(await f.text()) as Partial<State>;
      // Ancien choix « Satoshi » (plus proposé) : retour au franc CFA
      state = { ...state, ...saved, currency: isChoosable(saved.currency) ? saved.currency : 'XOF' };
    }
    listeners.forEach((fn) => fn());
  } catch {
    // Fichier absent ou illisible : valeurs par défaut
  }
}

/** Taux Breez, sinon CoinGecko. Le franc CFA est calculé depuis l'euro s'il manque. */
async function fetchPrices(): Promise<Prices> {
  let prices: Record<string, number>;
  try {
    prices = await fetchBtcPrices();
  } catch {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur,xof');
    const json = (await res.json()) as { bitcoin: Record<string, number> };
    prices = Object.fromEntries(Object.entries(json.bitcoin).map(([k, v]) => [k.toUpperCase(), v]));
  }
  if (!prices.EUR || !prices.USD) throw new Error('Taux incomplets');
  return { EUR: prices.EUR, USD: prices.USD, XOF: prices.XOF ?? prices.EUR * XOF_PER_EUR };
}

let refreshing = false;

/** Met à jour les taux s'ils datent de plus de 5 minutes. */
export async function refreshPrices(force = false) {
  if (refreshing || (!force && state.updatedAt && Date.now() - state.updatedAt < REFRESH_MS)) return;
  refreshing = true;
  try {
    update({ prices: await fetchPrices(), updatedAt: Date.now() });
  } catch {
    // Hors connexion : on garde les derniers taux connus
  } finally {
    refreshing = false;
  }
}

// --- Affichage ---

/** 2,5 → « 2,50 » (virgule, espaces fines entre milliers). */
function formatDecimal(n: number) {
  const [int, dec] = n.toFixed(2).split('.');
  return `${formatNumber(Number(int))},${dec}`;
}

/** Valeur en devise d'un montant en sats. */
export function convert(sats: number, currency: Exclude<Currency, 'SAT'>, prices = state.prices) {
  return (sats / SATS_PER_BTC) * prices[currency];
}

/** Valeur exprimée dans une monnaie : « 1 800 FCFA », « 2,74 € », « 3,10 $ ». */
export function formatValue(value: number, currency: Exclude<Currency, 'SAT'>) {
  if (currency === 'XOF') return `${formatNumber(Math.round(value))} FCFA`;
  const symbol = currency === 'EUR' ? '€' : '$';
  if (value > 0 && value < 0.01) return `< 0,01 ${symbol}`;
  return `${formatDecimal(value)} ${symbol}`;
}

/** « 5 000 sats », « 1 800 FCFA », « 2,74 € », « 3,10 $ ». */
export function formatIn(sats: number, currency: Currency, prices = state.prices) {
  if (currency === 'SAT') return `${formatNumber(sats)} ${Math.abs(sats) === 1 ? 'sat' : 'sats'}`;
  return formatValue(convert(sats, currency, prices), currency);
}

/** Montant fixé dans une monnaie (ex. loyer de 50 000 FCFA) : sa valeur en sats change avec le cours. */
export type FiatAmount = { currency: Exclude<Currency, 'SAT'>; amount: number };

// --- Saisie ---

/** Les centimes n'existent que pour l'euro et le dollar. */
export const hasDecimals = (currency: Currency) => currency === 'EUR' || currency === 'USD';

/** Montant en sats d'une valeur saisie dans une devise. */
export function toSats(value: number, currency: Currency, prices = state.prices) {
  if (currency === 'SAT') return Math.round(value);
  return Math.round((value / prices[currency]) * SATS_PER_BTC);
}

/** Lit un champ de saisie : « 12 500 » → 12500, « 2,5 » → 2.5. */
export function parseInput(text: string, currency: Currency) {
  if (!hasDecimals(currency)) return Number(text.replace(/\D/g, '')) || 0;
  const [int = '', dec = ''] = text.replace(/[^\d,.]/g, '').replace('.', ',').split(',');
  return Number(`${int.replace(/\D/g, '') || '0'}.${dec.replace(/\D/g, '').slice(0, 2) || '0'}`) || 0;
}

/** Remet en forme pendant la frappe : espaces entre milliers, virgule et 2 décimales au plus. */
export function formatInput(text: string, currency: Currency) {
  if (!hasDecimals(currency)) {
    const n = Number(text.replace(/\D/g, ''));
    return n ? formatNumber(n) : '';
  }
  const cleaned = text.replace(/[^\d,.]/g, '').replace('.', ',');
  const [int, ...rest] = cleaned.split(',');
  const intPart = int ? formatNumber(Number(int.replace(/\D/g, ''))) : rest.length ? '0' : '';
  return rest.length ? `${intPart},${rest.join('').replace(/\D/g, '').slice(0, 2)}` : intPart;
}

/** Texte de saisie correspondant à un montant en sats (pré-remplissage, facture). */
export function inputFromSats(sats: number, currency: Currency, prices = state.prices) {
  if (currency === 'SAT') return formatNumber(sats);
  const value = convert(sats, currency, prices);
  if (currency === 'XOF') return formatNumber(Math.round(value));
  return formatInput(value.toFixed(2).replace('.', ','), currency);
}

/** Montants proposés en un appui, adaptés à la devise. */
export const QUICK_AMOUNTS: Record<Currency, readonly string[]> = {
  XOF: ['1 000', '2 000', '5 000'],
  EUR: ['2', '5', '10'],
  USD: ['2', '5', '10'],
  SAT: ['1 000', '5 000', '10 000'],
};

/** Montant dans la devise choisie (pour le code hors React : notifications…). */
export const formatMoney = (sats: number) => formatIn(sats, state.currency);
