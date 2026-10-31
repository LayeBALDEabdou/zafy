import * as Clipboard from 'expo-clipboard';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input, Label } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useT } from '@/i18n';
import { describeDestination } from '@/lib/breez';
import { confirmAction } from '@/lib/confirm';
import { deleteContact, getContact, saveContact } from '@/lib/contacts';
import { cleanDestination, onScan } from '@/lib/scan';
import { colors, fonts } from '@/theme';

/** Modification d'un contact (`?id=`). Un nouveau contact s'ajoute en scannant sa carte : voir /ajouter-contact. */
export default function ContactForm() {
  const { t } = useT();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modification : on reprend les valeurs du contact
  useEffect(() => {
    if (!id) return;
    getContact(id).then((c) => {
      if (!c) return;
      setName(c.name);
      setPhone(c.phone ?? '');
      setAddress(c.address);
    });
  }, [id]);

  // Résultat du scanner de QR code
  useEffect(() => onScan((data) => setAddress(cleanDestination(data))), []);

  if (!id) return <Redirect href="/contacts" />;

  const save = async () => {
    setError(null);
    if (!name.trim()) return setError(t('contacts.errName'));
    if (!address.trim()) return setError(t('contacts.errAddress'));
    setSaving(true);
    try {
      // Il faut une adresse qui sert toujours : une facture ne se paie qu'une fois
      const dest = await describeDestination(address).catch(() => null);
      if (dest?.kind === 'invoice' || dest?.kind === 'sparkInvoice') {
        return setError(t('plans.errInvoice'));
      }
      if (dest?.kind !== 'spark' && dest?.kind !== 'bitcoin') {
        return setError(t('contacts.errUnknown'));
      }
      await saveContact(
        { name: name.trim(), phone: phone.trim() || undefined, address: address.trim(), identity: dest.identityPublicKey },
        id,
      );
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirmAction(t('contacts.deleteTitle'), t('contacts.deleteMessage', { name }), t('common.delete'), true))) return;
    await deleteContact(id);
    router.back();
  };

  return (
    <Screen header={<ScreenHeader title={t('contacts.editTitle')} />}>
      <Card style={styles.section}>
        <View style={styles.field}>
          <Label>{t('contacts.name')}</Label>
          <Input value={name} onChangeText={setName} placeholder={t('contacts.namePlaceholder')} autoCapitalize="words" />
        </View>
        <View style={styles.field}>
          <Label hint={t('common.optional')}>{t('common.phoneShort')}</Label>
          <Input value={phone} onChangeText={setPhone} placeholder="77 123 45 67" keyboardType="phone-pad" />
        </View>
      </Card>

      <Card style={styles.section}>
        <Label>{t('contacts.payAddress')}</Label>
        <View style={styles.addressRow}>
          <Input
            value={address}
            onChangeText={setAddress}
            placeholder={t('contacts.addressPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.addressInput}
          />
          <Pressable
            onPress={async () => setAddress(cleanDestination(await Clipboard.getStringAsync()))}
            accessibilityLabel={t('common.paste')}
            style={styles.action}>
            <Icon name="copy" size={18} color={colors.navy} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/scanner')}
            accessibilityLabel={t('common.scanQr')}
            style={[styles.action, styles.scan]}>
            <Icon name="scan" size={18} color={colors.turquoise} />
          </Pressable>
        </View>
        <View style={styles.note}>
          <Icon name="lock" size={16} color={colors.successText} />
          <Text style={styles.noteText}>
            {t('contacts.stayHere')}
          </Text>
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.buttons}>
        <Button title={t('common.delete')} variant="danger" style={styles.flex} onPress={saving ? undefined : remove} />
        <PrimaryButton
          title={saving ? t('common.saving') : t('common.save')}
          icon={saving ? <ActivityIndicator color={colors.navy} /> : undefined}
          style={styles.flex}
          onPress={saving ? undefined : save}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14 },
  field: { gap: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressInput: { flex: 1, minWidth: 0 },
  action: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scan: { backgroundColor: colors.navy },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noteText: { flex: 1, fontFamily: fonts.inter400, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  error: { fontFamily: fonts.inter600, fontSize: 14, color: colors.dangerText, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
