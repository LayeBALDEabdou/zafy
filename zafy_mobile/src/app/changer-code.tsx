import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type TextInputInstance } from 'react-native';

import { PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { Label } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { PinInput } from '@/components/PinInput';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useT } from '@/i18n';
import { changePin, isWeakPin, pinError } from '@/lib/account';
import { colors, fonts } from '@/theme';

/** Changer son code à 4 chiffres : l'ancien, le nouveau, puis le nouveau une seconde fois. */
export default function ChangerCode() {
  const { t } = useT();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const nextRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);

  // Passe au champ suivant dès que 4 chiffres sont saisis
  const onCurrent = (v: string) => {
    setCurrent(v);
    setError(null);
    if (v.length === 4) nextRef.current?.focus();
  };
  const onNext = (v: string) => {
    setNext(v);
    setError(null);
    if (v.length === 4) confirmRef.current?.focus();
  };

  const save = async () => {
    setError(null);
    if (current.length !== 4) return setError(t('security.errCurrent'));
    if (next.length !== 4) return setError(t('security.errNew'));
    if (next === current) return setError(t('security.errSame'));
    if (isWeakPin(next)) return setError(t('security.errWeak'));
    if (confirm !== next) {
      setConfirm('');
      return setError(t('security.errConfirm'));
    }
    setSaving(true);
    try {
      const check = await changePin(current, next);
      if (!check.ok) {
        setCurrent('');
        return setError(pinError(check));
      }
      setDone(true);
      setTimeout(() => router.back(), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen header={<ScreenHeader title={t('security.changePin')} />}>
      <Card style={styles.field}>
        <Label>{t('security.currentPin')}</Label>
        <PinInput value={current} onChange={onCurrent} />
      </Card>
      <Card style={styles.field}>
        <Label>{t('security.newPin')}</Label>
        <PinInput ref={nextRef} value={next} onChange={onNext} />
      </Card>
      <Card style={styles.field}>
        <Label>{t('security.confirmPin')}</Label>
        <PinInput ref={confirmRef} value={confirm} onChange={setConfirm} />
      </Card>

      <View style={styles.note}>
        <Icon name="lock" size={16} color={colors.successText} />
        <Text style={styles.noteText}>{t('security.pinNote')}</Text>
      </View>

      {done ? (
        <View style={styles.success}>
          <Icon name="check" size={18} color={colors.successText} strokeWidth={2.6} />
          <Text style={styles.successText}>{t('security.pinChanged')}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        title={saving ? t('common.saving') : t('common.save')}
        icon={saving ? <ActivityIndicator color={colors.navy} /> : undefined}
        onPress={saving || done ? undefined : save}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: 14 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 },
  noteText: { flex: 1, fontFamily: fonts.inter400, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  success: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.successBg,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  successText: { flex: 1, fontFamily: fonts.inter600, fontSize: 14, color: colors.successText },
  error: { fontFamily: fonts.inter600, fontSize: 14, color: colors.dangerText, textAlign: 'center' },
});
