import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useWallet } from '@/context/WalletContext';
import { useT } from '@/i18n';
import { lookupPhone, type PhoneLookup } from '@/lib/directory';
import { formatTarget } from '@/lib/nostr';
import { normalizePhone } from '@/lib/phone';
import { colors, fonts } from '@/theme';

/**
 * Lien court de carte (« https://zafy.vercel.app/ajouter-contact/771234567 ») :
 * cherche ce numéro dans l'annuaire Zafy, puis ouvre l'écran d'ajout avec le prénom et l'adresse trouvés.
 */
export default function AjouterContactNumero() {
  const { t } = useT();
  const { phone = '' } = useLocalSearchParams<{ phone?: string }>();
  const { profile, status } = useWallet();
  const [result, setResult] = useState<PhoneLookup | 'error' | null>(null);
  /** Incrémenté par « Réessayer » : relance la recherche. */
  const [attempt, setAttempt] = useState(0);
  const valid = /^\d{8,15}$/.test(phone);

  useEffect(() => {
    if (status !== 'ready' || !valid) return;
    let cancelled = false;
    lookupPhone(normalizePhone(phone))
      .then((res) => !cancelled && setResult(res))
      .catch(() => !cancelled && setResult('error'));
    return () => {
      cancelled = true;
    };
  }, [status, valid, phone, attempt]);

  const retry = () => {
    setResult(null);
    setAttempt((n) => n + 1);
  };

  if (profile === null || !valid) return <Redirect href="/" />;
  if (status === 'locked' && profile) {
    return <Redirect href={{ pathname: '/connexion', params: { next: `/ajouter-contact/${phone}` } }} />;
  }
  if (result && result !== 'error' && result.status === 'found') {
    return (
      <Redirect
        href={{
          pathname: '/ajouter-contact',
          params: { n: result.profile.name, a: result.profile.address, p: phone },
        }}
      />
    );
  }

  const message =
    result === 'error'
      ? t('send.zafyError')
      : result?.status === 'contested'
        ? t('contacts.shortContested')
        : result?.status === 'none'
          ? t('contacts.shortNone', { phone: formatTarget(`phone:${normalizePhone(phone)}`) })
          : null;

  return (
    <Screen header={<ScreenHeader title={t('contacts.newTitle')} />}>
      {message ? (
        <>
          <Text style={styles.message}>{message}</Text>
          {result === 'error' ? <Button title={t('common.retry')} onPress={retry} /> : null}
          <Button title={t('common.cancel')} variant="secondary" onPress={() => router.back()} />
        </>
      ) : (
        <ActivityIndicator color={colors.navy} style={styles.loading} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 80 },
  message: { fontFamily: fonts.inter500, fontSize: 15, lineHeight: 22, color: colors.navy, textAlign: 'center', marginTop: 24 },
});
