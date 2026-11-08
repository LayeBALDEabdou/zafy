import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input, Label } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { Toggle } from '@/components/Toggle';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useWallet } from '@/context/WalletContext';
import { useT } from '@/i18n';
import type { Profile } from '@/lib/account';
import { zafyAddress } from '@/lib/phone';
import { colors, fonts } from '@/theme';

/** « 771234567 » → « 77 123 45 67 » pour l'affichage dans le champ. */
const spaced = (digits: string) => digits.replace(/^(\d{2})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3 $4');

/** Modifier son prénom et son numéro (les clés et le code ne changent pas). */
export default function ModifierProfil() {
  const { t } = useT();
  const { profile } = useWallet();
  // Le formulaire démarre avec les valeurs actuelles : on attend que le profil soit lu
  if (!profile) {
    return (
      <Screen header={<ScreenHeader title={t('profile.editProfile')} />}>
        <ActivityIndicator color={colors.navy} style={styles.loading} />
      </Screen>
    );
  }
  return <ProfileForm profile={profile} />;
}

function ProfileForm({ profile }: { profile: Profile }) {
  const { t } = useT();
  const { updateProfile } = useWallet();
  const [name, setName] = useState(profile.firstName);
  const [phone, setPhone] = useState(spaced(profile.phone));
  const [discoverable, setDiscoverable] = useState(profile.discoverable !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = phone.replace(/\D/g, '');

  const save = async () => {
    setError(null);
    if (!name.trim()) return setError(t('common.enterFirstName'));
    if (digits.length !== 9) return setError(t('common.phoneNineDigits'));
    setSaving(true);
    try {
      await updateProfile({ firstName: name.trim(), phone: digits, discoverable });
      router.back();
    } catch (e) {
      setError(t('profile.editFailed', { error: e instanceof Error ? e.message : String(e) }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen header={<ScreenHeader title={t('profile.editProfile')} />}>
      <Card fill style={styles.form}>
        <View style={styles.field}>
          <Label>{t('common.firstName')}</Label>
          <Input value={name} onChangeText={setName} autoCapitalize="words" placeholder={t('common.firstNamePlaceholder')} />
        </View>
        <View style={styles.field}>
          <Label>{t('common.phone')}</Label>
          <View style={styles.phoneRow}>
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>+221</Text>
            </View>
            <Input
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="77 123 45 67"
              style={styles.flex}
            />
          </View>
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.flex}>
            <Text style={styles.toggleTitle}>{t('profile.discoverable')}</Text>
            <Text style={styles.noteText}>
              {discoverable
                ? t('profile.discoverableOn', { address: zafyAddress(digits.length === 9 ? digits : '77xxxxxxx') })
                : t('profile.discoverableOff')}
            </Text>
          </View>
          <Toggle value={discoverable} onChange={setDiscoverable} label={t('profile.discoverable')} />
        </View>
        <View style={styles.note}>
          <Icon name="lock" size={16} color={colors.successText} />
          <Text style={styles.noteText}>
            {t('profile.editNote')}
          </Text>
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        title={saving ? t('common.saving') : t('common.save')}
        icon={saving ? <ActivityIndicator color={colors.navy} /> : undefined}
        onPress={saving ? undefined : save}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 40 },
  form: { gap: 16 },
  field: { gap: 8 },
  phoneRow: { flexDirection: 'row', gap: 8 },
  prefix: {
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.navy,
    justifyContent: 'center',
  },
  prefixText: { fontFamily: fonts.inter600, fontSize: 15, color: colors.white },
  flex: { flex: 1, minWidth: 0 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTitle: { fontFamily: fonts.inter600, fontSize: 15, color: colors.navy, marginBottom: 2 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noteText: { flex: 1, fontFamily: fonts.inter400, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  error: { fontFamily: fonts.inter600, fontSize: 14, color: colors.dangerText, textAlign: 'center' },
});
