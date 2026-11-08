import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { Label } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { PinInput } from '@/components/PinInput';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useBiometricUnlock } from '@/hooks/useBiometricUnlock';
import { useT } from '@/i18n';
import { loadMnemonic, pinError, verifyPin } from '@/lib/account';
import { colors, fonts } from '@/theme';

const WARNINGS = ['keys.tip1', 'keys.tip2', 'keys.tip3'] as const;

/** Sauvegarde des 12 mots : seul moyen de récupérer le portefeuille si le téléphone est perdu. */
export default function Cles() {
  const { t } = useT();
  const { availability, authenticate } = useBiometricUnlock();
  const [words, setWords] = useState<string[] | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const show = async () => {
    const mnemonic = await loadMnemonic();
    if (!mnemonic) return setError(t('keys.noKey'));
    setWords(mnemonic.split(' '));
  };

  // Avec le code Zafy (toujours possible)
  const revealWithPin = async (value: string) => {
    setPin(value);
    setError(null);
    if (value.length < 4) return;
    const check = await verifyPin(value);
    if (check.ok) await show();
    else setError(pinError(check));
    setPin('');
  };

  // Avec l'empreinte, si le téléphone en a une
  const revealWithBiometrics = async () => {
    setError(null);
    const result = await authenticate();
    if (result === true) await show();
    else if (result) setError(result);
  };

  return (
    <Screen header={<ScreenHeader title={t('keys.title')} />}>
      <Card style={styles.warning}>
        {WARNINGS.map((w) => (
          <View key={w} style={styles.warningRow}>
            <Icon name="alert" size={18} color={colors.warningText} strokeWidth={2.4} />
            <Text style={styles.warningText}>{t(w)}</Text>
          </View>
        ))}
      </Card>

      <Card fill style={styles.words}>
        {words ? (
          <View style={styles.grid}>
            {words.map((w, i) => (
              <View key={i} style={styles.word}>
                <Text style={styles.wordIndex}>{i + 1}</Text>
                <Text style={styles.wordText}>{w}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.hidden}>
            <Icon name="lock" size={28} color={colors.successText} />
            <Text style={styles.hiddenText}>{t('keys.hidden')}</Text>
            <View style={styles.pin}>
              <Label>{t('keys.enterPinToShow')}</Label>
              {/* Le code s'affiche dès le 4e chiffre */}
              <PinInput value={pin} onChange={revealWithPin} />
            </View>
          </View>
        )}
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!words && availability === 'available' ? (
        <Button
          title={t('common.useFingerprint')}
          variant="secondary"
          icon={<Icon name="fingerprint" size={20} color={colors.navy} />}
          onPress={revealWithBiometrics}
        />
      ) : null}
      {words ? <PrimaryButton title={t('keys.done')} onPress={() => router.back()} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  warning: { backgroundColor: colors.warningBg, gap: 12 },
  warningRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  warningText: { flex: 1, fontFamily: fonts.inter500, fontSize: 14, lineHeight: 20, color: colors.navy },
  words: { justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  word: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.input,
    paddingHorizontal: 12,
  },
  wordIndex: { width: 20, fontFamily: fonts.inter600, fontSize: 13, color: colors.textSecondary },
  wordText: { fontFamily: fonts.sora600, fontSize: 15, color: colors.navy },
  hidden: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  pin: { alignSelf: 'stretch', gap: 12, marginTop: 8 },
  hiddenText: { fontFamily: fonts.inter400, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  error: { fontFamily: fonts.inter600, fontSize: 14, color: colors.dangerText, textAlign: 'center' },
});
