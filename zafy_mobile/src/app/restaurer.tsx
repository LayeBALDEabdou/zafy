import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type TextInputInstance } from 'react-native';

import { Badge } from '@/components/Badge';
import { PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { Label, TextArea } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { PinInput } from '@/components/PinInput';
import { Screen } from '@/components/Screen';
import { ProfileFields } from '@/components/ProfileFields';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useWallet } from '@/context/WalletContext';
import { useT } from '@/i18n';
import { cleanName, isFullName, isValidMnemonic, isValidPhone } from '@/lib/account';
import { colors, fonts } from '@/theme';

/** Minuscules, un seul espace entre les mots (copier-coller, retours à la ligne…). */
const normalizeWords = (s: string) => s.trim().toLowerCase().split(/\s+/).filter(Boolean);

/** Récupérer un portefeuille avec ses 12 mots (nouveau téléphone ou code oublié). */
export default function Restaurer() {
  const { t } = useT();
  const { profile, restore } = useWallet();
  const [words, setWords] = useState('');
  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pinRef = useRef<TextInputInstance>(null);

  const list = normalizeWords(words);
  const mnemonic = list.join(' ');
  const complete = list.length === 12;
  const valid = complete && isValidMnemonic(mnemonic);

  const submit = async () => {
    if (!valid) {
      return setError(
        complete
          ? t('onboarding.wordsInvalid')
          : t('onboarding.wordsCount', { n: list.length }),
      );
    }
    if (!isFullName(name)) return setError(t('common.enterFullName'));
    if (!isValidPhone(phone)) return setError(t('common.phoneNineDigits'));
    if (pin.length !== 4) {
      setError(t('onboarding.chooseNewPinError'));
      return pinRef.current?.focus();
    }
    setError(null);
    setLoading(true);
    try {
      await restore({ name: cleanName(name), phone }, pin, mnemonic);
      router.replace('/accueil');
    } catch (e) {
      setError(t('onboarding.restoreFailed', { error: e instanceof Error ? e.message : String(e) }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen header={<ScreenHeader title={t('onboarding.restoreTitle')} />}>
      <Card style={styles.gap10}>
        <Label>{t('onboarding.restoreWords')}</Label>
        <TextArea
          value={words}
          onChangeText={setWords}
          placeholder={t('onboarding.wordsPlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          style={styles.words}
        />
        {words ? (
          valid ? (
            <Badge
              label={t('onboarding.wordsValid')}
              icon={<Icon name="check" size={14} color={colors.successText} strokeWidth={2.8} />}
            />
          ) : (
            <Badge label={complete ? t('onboarding.wordsWrong') : t('onboarding.wordsProgress', { n: list.length })} tone={complete ? 'danger' : 'neutral'} />
          )
        ) : null}
      </Card>

      <Card style={styles.gap16}>
        <ProfileFields name={name} onNameChange={setName} phone={phone} onPhoneChange={setPhone} />
      </Card>

      <Card fill style={styles.pinCard}>
        <Label>{t('onboarding.chooseNewPin')}</Label>
        <PinInput ref={pinRef} value={pin} onChange={setPin} />
        <View style={styles.note}>
          <Icon name="lock" size={16} color={colors.successText} />
          <Text style={styles.noteText}>{t('onboarding.wordsStayHere')}</Text>
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        title={loading ? t('onboarding.restoring') : t('onboarding.restoreTitle')}
        icon={loading ? <ActivityIndicator color={colors.navy} /> : undefined}
        onPress={loading ? undefined : submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap8: { gap: 8 },
  gap10: { gap: 10 },
  gap16: { gap: 16 },
  words: { minHeight: 110, flexGrow: 0 },
  flex: { flex: 1, minWidth: 0 },
  pinCard: { justifyContent: 'center', gap: 18 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteText: { flex: 1, fontFamily: fonts.inter400, fontSize: 13, color: colors.textSecondary },
  error: { fontFamily: fonts.inter600, fontSize: 14, color: colors.dangerText, textAlign: 'center' },
});
