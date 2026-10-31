// Données factices restantes (IA) — l'IA est à brancher. Les alertes passent par Nostr : voir src/lib/nostr.ts.
// Le portefeuille (solde, paiements) passe déjà par Breez : voir src/lib/breez.ts.

export const formatNumber = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');

export const parseAmount = (s: string) => Number(s.replace(/\D/g, '')) || 0;

export type Transaction = {
  id: string;
  /** Texte de la facture (envois), ex. « Paiement à Fatou ». */
  description?: string;
  /** Type de paiement : son nom traduit sert de titre à défaut de description. */
  method: 'lightning' | 'spark' | 'token' | 'deposit' | 'withdraw' | 'other';
  status?: 'pending' | 'failed';
  feeSats: number;
  /** Positif = reçu, négatif = envoyé (en sats). */
  amount: number;
  date: Date;
  /** Adresse du destinataire, pour les envois faits depuis Zafy (sert à retrouver le contact). */
  counterparty?: string;
};

/** `raisons` : clés de traduction (« verify.reasonCode »…). */
export type ScamVerdict = {
  verdict: 'arnaque' | 'suspect' | 'sur';
  score: number;
  raisons: ('verify.reasonCode' | 'verify.reasonPressure' | 'verify.reasonLink')[];
};

/** Simule l'API d'IA : à remplacer par l'appel LLM réel. */
export async function analyzeMessage(_sender: string, message: string): Promise<ScamVerdict> {
  await new Promise((r) => setTimeout(r, 600));
  const m = message.toLowerCase();
  const raisons: ScamVerdict['raisons'] = [];
  if (/code|pin|secret/.test(m)) raisons.push('verify.reasonCode');
  if (/suspendu|bloqué|urgent|immédiatement/.test(m)) raisons.push('verify.reasonPressure');
  if (/http|lien|cliquez/.test(m)) raisons.push('verify.reasonLink');
  if (raisons.length >= 2) return { verdict: 'arnaque', score: 0.92, raisons };
  if (raisons.length === 1) return { verdict: 'suspect', score: 0.6, raisons };
  return { verdict: 'sur', score: 0.1, raisons: [] };
}
