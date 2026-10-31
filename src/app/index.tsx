import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { LogoMark } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { useWallet } from '@/context/WalletContext';
import { takeLanguageReturnRoute, useT } from '@/i18n';
import { colors, fonts } from '@/theme';

/** A — Bienvenue */
export default function Bienvenue() {
  const { t } = useT();
  const { profile, status } = useWallet();

  // Lecture du stockage en cours : fond navy, sans contenu.
  if (profile === undefined) return <View style={styles.loading} />;
  // Portefeuille déjà ouvert (ex. navigation reconstruite après un changement de langue) : pas de code à retaper.
  if (profile && status === 'ready') return <Redirect href={takeLanguageReturnRoute() ?? '/accueil'} />;
  // Un compte existe déjà sur ce téléphone : on va directement au déverrouillage.
  if (profile) return <Redirect href="/connexion" />;

  return (
    <Screen background={colors.navy} statusBar="light" style={styles.screen}>
      <View pointerEvents="none" style={[styles.circle, styles.circleTop]} />
      <View pointerEvents="none" style={[styles.circle, styles.circleBottom]} />

      <View style={styles.brand}>
        <LogoMark size={72} />
        <Text style={styles.title}>zafy</Text>
        <Text style={styles.tagline}>{t('onboarding.tagline')}</Text>
      </View>

      <View style={styles.actions}>
        <Button title={t('onboarding.createAccount')} onPress={() => router.push('/inscription')} />
        <Button title={t('onboarding.login')} variant="outline" onPress={() => router.push('/connexion')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.navy },
  screen: { gap: 0, overflow: 'hidden' },
  circle: { position: 'absolute' },
  circleTop: { right: -110, top: -110, width: 320, height: 320, borderRadius: 160, backgroundColor: colors.turquoise },
  circleBottom: { left: -90, bottom: 150, width: 240, height: 240, borderRadius: 120, backgroundColor: colors.navy2 },
  brand: { flexGrow: 1, justifyContent: 'center', gap: 20 },
  title: { fontFamily: fonts.sora700, fontSize: 56, letterSpacing: -2, lineHeight: 60, color: colors.white },
  tagline: { fontFamily: fonts.inter400, fontSize: 20, lineHeight: 28, color: colors.textOnNavy, maxWidth: 280 },
  actions: { gap: 12 },
});
