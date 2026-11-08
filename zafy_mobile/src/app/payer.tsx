import { Redirect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { Screen } from '@/components/Screen';
import { useWallet } from '@/context/WalletContext';
import { paymentPath } from '@/lib/paymentLink';
import { colors } from '@/theme';

/**
 * Lien de paiement reçu (« https://zafy.vercel.app/payer?r=… ») : ouvre Envoyer avec la facture.
 * Rien n'est payé sans confirmation : l'utilisateur voit le montant, le destinataire et les signalements.
 */
export default function Payer() {
  const { r: invoice = '', n: name, s } = useLocalSearchParams<{ r?: string; n?: string; s?: string }>();
  const { profile, status } = useWallet();

  // Pas de compte sur ce téléphone, ou lien abîmé : écran d'accueil
  if (profile === null || !invoice) return <Redirect href="/" />;
  // App verrouillée : déverrouiller d'abord, puis revenir ici
  if (status === 'locked' && profile) {
    const sats = Number(s) || undefined;
    return <Redirect href={{ pathname: '/connexion', params: { next: paymentPath({ invoice, name, sats }) } }} />;
  }
  if (status === 'ready') return <Redirect href={{ pathname: '/envoyer', params: { to: invoice } }} />;
  return (
    <Screen>
      <ActivityIndicator color={colors.navy} style={styles.loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 80 },
});
