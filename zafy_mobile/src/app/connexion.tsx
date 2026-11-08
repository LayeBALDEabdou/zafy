import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { PinDots, PinPad } from '@/components/PinPad';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useWallet } from '@/context/WalletContext';
import { useBiometricUnlock } from '@/hooks/useBiometricUnlock';
import { useT } from '@/i18n';
import { checkPin, firstNameOf } from '@/lib/account';
import { colors, fonts } from '@/theme';

/** C — Connexion (déverrouillage par code ou empreinte) */
export default function Connexion() {
  const { t } = useT();
  const { profile, unlock } = useWallet();
  // Page à rouvrir après déverrouillage (ex. paiement planifié ouvert depuis un rappel)
  const { next: nextPage } = useLocalSearchParams<{ next?: string }>();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const { availability, authenticate } = useBiometricUnlock();
  const prompted = useRef(false);
  // La maquette fait 844 de haut : on resserre le clavier sur les écrans plus petits.
  const { height } = useWindowDimensions();
  const compact = height < 820;

  /** Ouvre le portefeuille Breez puis va à l'accueil. */
  const openWallet = async () => {
    setOpening(true);
    try {
      await unlock();
      router.replace('/accueil');
      if (nextPage) router.push(nextPage as Href);
    } catch (e) {
      setError(t('onboarding.loginFailed', { error: e instanceof Error ? e.message : String(e) }));
    } finally {
      setOpening(false);
    }
  };

  const unlockWithBiometrics = async () => {
    if (!profile || opening) return;
    setError(null);
    const result = await authenticate();
    if (result === true) await openWallet();
    else setError(result);
  };

  const typeDigit = async (d: string) => {
    if (opening || pin.length >= 4) return;
    setError(null);
    const next = pin + d;
    setPin(next);
    if (next.length < 4) return;
    if (await checkPin(next)) {
      await openWallet();
    } else {
      setError(t('common.wrongPin'));
    }
    setPin('');
  };

  // Propose l'empreinte dès l'ouverture si le téléphone en a une.
  useEffect(() => {
    if (availability === 'available' && profile && !prompted.current) {
      prompted.current = true;
      unlockWithBiometrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability, profile]);

  // Aucun compte enregistré sur ce téléphone
  if (profile === null) {
    return (
      <Screen header={<ScreenHeader />}>
        <View style={styles.center}>
          <Text style={styles.title}>{t('onboarding.noAccount')}</Text>
          <Text style={[styles.subtitle, { textAlign: 'center' }]}>
            {t('onboarding.noAccountHint')}
          </Text>
        </View>
        <Pressable onPress={() => router.replace('/inscription')} style={styles.restore}>
          <Text style={styles.restoreText}>{t('onboarding.createAccount')}</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/restaurer')} style={styles.restore}>
          <Text style={styles.restoreText}>{t('onboarding.alreadyHaveWallet')}</Text>
        </Pressable>
      </Screen>
    );
  }

  const initial = profile?.name.charAt(0).toUpperCase() ?? '';

  return (
    <Screen style={compact ? styles.screenCompact : styles.screen} header={<ScreenHeader />}>
      <View style={[styles.center, compact && { gap: 10 }]}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </View>
        <Text style={styles.title}>{t('onboarding.welcomeBack', { name: profile ? firstNameOf(profile.name) : '' })}</Text>
        {/* Le message d'erreur remplace la consigne pour ne pas ajouter de ligne */}
        <Text style={error ? styles.error : styles.subtitle} accessibilityLiveRegion="polite">
          {opening ? t('onboarding.openingWallet') : (error ?? t('onboarding.enterPin'))}
        </Text>
        {opening ? <ActivityIndicator color={colors.navy} /> : <PinDots length={4} filled={pin.length} />}
      </View>

      <PinPad
        onDigit={typeDigit}
        onDelete={() => setPin((p) => p.slice(0, -1))}
        onBiometric={unlockWithBiometrics}
        biometricDisabled={availability !== 'available'}
        keyHeight={compact ? 54 : 64}
      />

      <Pressable onPress={() => router.push('/restaurer')} style={styles.restore}>
        <Text style={styles.restoreText}>{t('onboarding.forgotPin')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 32 },
  screenCompact: { gap: 16, paddingTop: 12, paddingBottom: 12 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  avatarRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: colors.turquoise, padding: 4 },
  avatar: { flex: 1, borderRadius: 999, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.sora700, fontSize: 24, color: colors.white },
  title: { fontFamily: fonts.sora700, fontSize: 24, color: colors.navy, textAlign: 'center' },
  subtitle: { fontFamily: fonts.inter400, fontSize: 15, color: colors.textSecondary },
  error: { fontFamily: fonts.inter600, fontSize: 15, color: colors.dangerText, textAlign: 'center' },
  restore: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
  restoreText: {
    fontFamily: fonts.inter600,
    fontSize: 14,
    color: colors.successText,
    textDecorationLine: 'underline',
  },
});
