import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type TextInputInstance } from 'react-native';

import { Badge } from '@/components/Badge';
import { PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { Label } from '@/components/Form';
import { PinInput } from '@/components/PinInput';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ProfileFields } from '@/components/ProfileFields';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useWallet } from '@/context/WalletContext';
import { useT } from '@/i18n';
import { cleanName, isFullName, isValidPhone } from '@/lib/account';
import { zafyAddress } from '@/lib/phone';
import { colors, fonts } from '@/theme';

/** B — Inscription */
export default function Inscription() {
  const { t } = useT();
  const { signUp } = useWallet();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pinRef = useRef<TextInputInstance>(null);

  const address = zafyAddress(name || 'Prénom Nom', phone || '77xxxxxxx');
  const canSubmit = isFullName(name) && isValidPhone(phone) && pin.length === 4;

  const submit = async () => {
    if (!isFullName(name)) return setError(t('common.enterFullName'));
    if (!isValidPhone(phone)) return setError(t('common.phoneNineDigits'));
    if (pin.length !== 4) {
      setError(t('onboarding.choosePinError'));
      return pinRef.current?.focus();
    }
    setError(null);
    setLoading(true);
    try {
      // Crée les 12 mots sur le téléphone puis ouvre le portefeuille Breez.
      await signUp({ name: cleanName(name), phone }, pin);
      router.replace('/accueil');
    } catch (e) {
      setError(t('onboarding.createFailed', { error: e instanceof Error ? e.message : String(e) }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen header={<ScreenHeader title={t('onboarding.createAccount')} />}>
      <Card style={styles.form}>
        <ProfileFields name={name} onNameChange={setName} phone={phone} onPhoneChange={setPhone} />
        <Badge
          label={address}
          py={7}
          icon={<Icon name="bolt" size={14} color={colors.successText} strokeWidth={2.6} />}
        />
      </Card>

      <Card fill style={styles.pinCard}>
        <Label>{t('onboarding.choosePin')}</Label>
        <PinInput ref={pinRef} value={pin} onChange={setPin} />
        <View style={styles.note}>
          <Icon name="lock" size={16} color={colors.successText} />
          <Text style={styles.noteText}>{t('onboarding.keysCreatedHere')}</Text>
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        title={loading ? t('onboarding.creatingWallet') : t('onboarding.createAccount')}
        icon={loading ? <ActivityIndicator color={colors.navy} /> : undefined}
        onPress={loading ? undefined : submit}
        style={!canSubmit && !loading ? { opacity: 0.6 } : undefined}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  field: { gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  pinCard: { justifyContent: 'center', gap: 18 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  error: { fontFamily: fonts.inter600, fontSize: 14, color: colors.dangerText, textAlign: 'center' },
  noteText: { fontFamily: fonts.inter400, fontSize: 13, color: colors.textSecondary },
});
