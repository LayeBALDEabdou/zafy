import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useWallet } from '@/context/WalletContext';
import { getSparkAddress } from '@/lib/breez';
import { normalizePhone, reportsAgainst, resolveTarget, type ReportSummary } from '@/lib/nostr';

type OwnReports = {
  /** Numéro et compte Spark de l'utilisateur, au format des signalements. */
  targets: string[];
  /** Signalements qui le visent, du plus signalé au moins signalé (vide si aucun). */
  summaries: ReportSummary[];
};

const REFRESH_MS = 60_000;
// Partagé entre les écrans : pas de nouvelle requête à chaque changement d'onglet
let cache: (OwnReports & { at: number; phone: string }) | null = null;

/** Le compte de l'utilisateur (numéro, adresse Spark) a-t-il été signalé sur Nostr ? */
export function useOwnReports(): OwnReports {
  const { profile, status } = useWallet();
  const [result, setResult] = useState<OwnReports>(cache ?? { targets: [], summaries: [] });

  useFocusEffect(
    useCallback(() => {
      if (status !== 'ready' || !profile) return;
      // Numéro modifié dans le Profil : on recherche tout de suite
      if (cache && cache.phone === profile.phone && Date.now() - cache.at < REFRESH_MS) return;
      let cancelled = false;
      (async () => {
        const targets = [`phone:${normalizePhone(profile.phone)}`];
        const spark = await getSparkAddress().catch(() => null);
        const own = spark ? await resolveTarget(spark).catch(() => null) : null;
        if (own) targets.push(own);
        const summaries = await reportsAgainst(targets).catch(() => null);
        if (!summaries) return;
        cache = { targets, summaries, at: Date.now(), phone: profile.phone };
        if (!cancelled) setResult(cache);
      })();
      return () => {
        cancelled = true;
      };
    }, [status, profile]),
  );

  return result;
}
