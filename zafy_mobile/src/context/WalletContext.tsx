import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import type { Transaction } from '@/data/mock';
import { t } from '@/i18n';
import { createAccount, generateMnemonic, loadMnemonic, loadProfile, saveProfile, type Profile } from '@/lib/account';
import {
  connectWallet,
  disconnectWallet,
  getBalanceSats,
  listTransactions,
  onWalletEvent,
  receivedPayment,
} from '@/lib/breez';
import { formatMoney } from '@/lib/currency';
import { syncPublicProfile } from '@/lib/directory';
import { hideTransaction as hideTransactionOnDevice, loadHiddenTransactions } from '@/lib/hiddenTransactions';
import { ensureNotificationPermission, notifyNow } from '@/lib/notifications';
import { forgetNostrKey } from '@/lib/relays';

type Status = 'locked' | 'connecting' | 'ready' | 'error';
/** Annuaire Zafy : le profil public est-il à jour sur Nostr ? */
type DirectoryStatus = 'idle' | 'syncing' | 'synced' | 'error';

type WalletState = {
  /** `undefined` pendant la lecture du stockage, `null` si aucun compte sur ce téléphone. */
  profile: Profile | null | undefined;
  status: Status;
  error: string | null;
  balanceSats: number | null;
  transactions: Transaction[];
  /** Crée les 12 mots, enregistre le compte et ouvre le portefeuille. */
  signUp: (profile: Profile, pin: string) => Promise<void>;
  /** Récupère un portefeuille existant avec ses 12 mots et choisit un nouveau code. */
  restore: (profile: Profile, pin: string, mnemonic: string) => Promise<void>;
  /** Ouvre le portefeuille (après vérification du code ou de l'empreinte). */
  unlock: () => Promise<void>;
  /** Ferme le portefeuille ; les clés restent sur le téléphone. */
  lock: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Retire une transaction de l'historique de ce téléphone (elle reste sur le réseau). */
  hideTransaction: (id: string) => Promise<void>;
  /** Enregistre le prénom et le numéro modifiés (et met à jour l'annuaire Zafy). */
  updateProfile: (profile: Profile) => Promise<void>;
  directory: DirectoryStatus;
  /** Republie le profil public (ex. après un échec réseau). */
  syncDirectory: () => void;
};

const WalletContext = createContext<WalletState | null>(null);

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function WalletProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [status, setStatus] = useState<Status>('locked');
  const [error, setError] = useState<string | null>(null);
  const [balanceSats, setBalanceSats] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const unsubscribe = useRef<(() => void) | null>(null);
  /** Paiements reçus déjà notifiés (un même paiement peut revenir dans plusieurs événements). */
  const notified = useRef(new Set<string>());
  const [directory, setDirectory] = useState<DirectoryStatus>('idle');
  /** Profil courant, lu par la synchro de l'annuaire (évite une dépendance qui relancerait la connexion). */
  const profileRef = useRef<Profile | null | undefined>(undefined);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    loadProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  const refresh = useCallback(async () => {
    const [balance, txs, hidden] = await Promise.all([getBalanceSats(), listTransactions(), loadHiddenTransactions()]);
    setBalanceSats(balance);
    setTransactions(txs.filter((tx) => !hidden.has(tx.id)));
  }, []);

  const hideTransaction = useCallback(async (id: string) => {
    await hideTransactionOnDevice(id);
    setTransactions((txs) => txs.filter((tx) => tx.id !== id));
  }, []);

  /** Publie ou retire le profil public selon le choix de l'utilisateur ; n'échoue jamais. */
  const syncDirectory = useCallback(() => {
    const current = profileRef.current;
    if (!current) return;
    setDirectory('syncing');
    syncPublicProfile(current)
      .then(() => setDirectory('synced'))
      .catch(() => setDirectory('error'));
  }, []);

  const open = useCallback(
    async (mnemonic: string) => {
      setStatus('connecting');
      setError(null);
      try {
        await connectWallet(mnemonic);
        unsubscribe.current?.();
        // Synchro terminée, paiement reçu ou envoyé : on recharge solde et historique.
        unsubscribe.current = await onWalletEvent((event) => {
          refresh().catch(() => {});
          // Argent reçu : on prévient (une seule fois par paiement)
          const received = receivedPayment(event);
          if (received && !notified.current.has(received.id)) {
            notified.current.add(received.id);
            notifyNow(
              'received',
              t('plans.receivedTitle'),
              `+${formatMoney(received.amount)}`,
            ).catch(() => {});
          }
        });
        await refresh();
        setStatus('ready');
        syncDirectory();
        // Pour être prévenu des paiements reçus (demandé une seule fois)
        ensureNotificationPermission().catch(() => {});
      } catch (e) {
        setStatus('error');
        setError(errorMessage(e));
        throw e;
      }
    },
    [refresh, syncDirectory],
  );

  const signUp = useCallback(
    async (newProfile: Profile, pin: string) => {
      const mnemonic = generateMnemonic();
      await createAccount(newProfile, pin, mnemonic);
      forgetNostrKey();
      profileRef.current = newProfile;
      setProfile(newProfile);
      await open(mnemonic);
    },
    [open],
  );

  const restore = useCallback(
    async (newProfile: Profile, pin: string, mnemonic: string) => {
      // Remplace le compte de ce téléphone (ex. code oublié) ; les fonds suivent les 12 mots.
      unsubscribe.current?.();
      unsubscribe.current = null;
      await disconnectWallet();
      await createAccount(newProfile, pin, mnemonic);
      forgetNostrKey();
      profileRef.current = newProfile;
      setProfile(newProfile);
      await open(mnemonic);
    },
    [open],
  );

  const unlock = useCallback(async () => {
    const mnemonic = await loadMnemonic();
    if (!mnemonic) throw new Error(t('errors.noWallet'));
    await open(mnemonic);
  }, [open]);

  const lock = useCallback(async () => {
    unsubscribe.current?.();
    unsubscribe.current = null;
    await disconnectWallet();
    forgetNostrKey();
    setDirectory('idle');
    setStatus('locked');
    setBalanceSats(null);
    setTransactions([]);
  }, []);

  const updateProfile = useCallback(
    async (next: Profile) => {
      await saveProfile(next);
      profileRef.current = next;
      setProfile(next);
      if (status === 'ready') syncDirectory();
    },
    [status, syncDirectory],
  );

  return (
    <WalletContext.Provider
      value={{
        profile,
        status,
        error,
        balanceSats,
        transactions,
        signUp,
        restore,
        unlock,
        lock,
        refresh,
        updateProfile,
        hideTransaction,
        directory,
        syncDirectory,
      }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet doit être utilisé dans <WalletProvider>');
  return ctx;
}
