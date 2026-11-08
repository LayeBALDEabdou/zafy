import { Redirect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { Screen } from '@/components/Screen';
import { useWallet } from '@/context/WalletContext';
import { readAmount, shortPaymentPath } from '@/lib/paymentLink';
import { zafyAddress } from '@/lib/phone';
import { colors } from '@/theme';

/**
 * Lien court de paiement (« https://zafy.vercel.app/payer/771234567?m=5000&c=XOF ») :
 * ouvre Envoyer vers ce numéro Zafy, montant pré-rempli. Rien n'est payé sans confirmation.
 */
export default function PayerNumero() {
  const { phone = '', m, c } = useLocalSearchParams<{ phone?: string; m?: string; c?: string }>();
  const { profile, status } = useWallet();
  const amount = readAmount(m, c);

  if (profile === null || !/^\d{8,15}$/.test(phone)) return <Redirect href="/" />;
  // App verrouillée : déverrouiller d'abord, puis revenir ici
  if (status === 'locked' && profile) {
    return <Redirect href={{ pathname: '/connexion', params: { next: shortPaymentPath({ phone, ...amount }) } }} />;
  }
  if (status === 'ready') {
    return (
      <Redirect
        href={{
          pathname: '/envoyer',
          params: {
            to: zafyAddress(phone),
            ...(amount.amount ? { m: String(amount.amount), c: amount.currency } : {}),
          },
        }}
      />
    );
  }
  return (
    <Screen>
      <ActivityIndicator color={colors.navy} style={styles.loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 80 },
});
