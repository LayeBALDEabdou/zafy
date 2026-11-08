import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChoiceGroup, Input, Label, TextArea } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useOwnReports } from '@/hooks/useOwnReports';
import { useT } from '@/i18n';
import {
  MAX_REPORT_MESSAGE,
  publishReport,
  REPORT_TYPES,
  reportsFor,
  reportTypeLabel,
  resolveTarget,
  targetToInput,
  type ReportType,
} from '@/lib/nostr';
import { cleanDestination, onScan } from '@/lib/scan';
import { colors, fonts } from '@/theme';


/** 07 — Signaler un numéro ou une adresse (publié sur Nostr). */
export default function Signaler() {
  const { t } = useT();
  const params = useLocalSearchParams<{ target?: string; message?: string }>();
  const [target, setTarget] = useState(params.target ? targetToInput(params.target) : '');
  const [type, setType] = useState<ReportType>(REPORT_TYPES[0].slug);
  const [message, setMessage] = useState(params.message ?? '');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ownTargets = useOwnReports().targets;

  // Résultat du scanner de QR code
  useEffect(() => onScan((data) => setTarget(cleanDestination(data))), []);

  const publish = async () => {
    setError(null);
    if (!target.trim()) return setError(t('report.errTarget'));
    setPublishing(true);
    try {
      const resolved = await resolveTarget(target);
      if (!resolved) return setError(t('report.errUnknown'));
      if (ownTargets.includes(resolved)) return setError(t('report.errSelf'));
      // Déjà signalé par l'utilisateur : on montre l'alerte au lieu de publier un doublon
      const existing = await reportsFor(resolved).catch(() => null);
      if (existing?.mine) return setError(t('report.errAlreadyReported'));
      await publishReport({ target: resolved, type, message });
      router.replace({ pathname: '/alerte/[id]', params: { id: resolved, published: '1' } });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Screen header={<ScreenHeader title={t('report.title')} />}>
      <Card style={styles.section}>
        <Label>{t('report.target')}</Label>
        <View style={styles.targetRow}>
          <Input
            value={target}
            onChangeText={setTarget}
            placeholder={t('report.targetPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.targetInput}
          />
          <Pressable
            onPress={async () => setTarget(cleanDestination(await Clipboard.getStringAsync()))}
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
      </Card>

      <Card style={styles.section}>
        <Label>{t('report.type')}</Label>
        <ChoiceGroup
          options={REPORT_TYPES.map((r) => r.slug)}
          value={type}
          onChange={setType}
          columns={2}
          getLabel={reportTypeLabel}
        />
      </Card>

      <Card fill style={styles.section}>
        <Label hint={t('common.optional')}>{t('report.message')}</Label>
        <TextArea
          value={message}
          onChangeText={setMessage}
          maxLength={MAX_REPORT_MESSAGE}
          placeholder={t('report.messagePlaceholder')}
        />
        <Text style={styles.counter}>
          {message.length} / {MAX_REPORT_MESSAGE}
        </Text>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.section}>
        <View style={styles.privacy}>
          <Icon name="lock" size={16} color={colors.successText} />
          <Text style={styles.privacyText}>{t('report.privacy')}</Text>
        </View>
        <PrimaryButton
          title={publishing ? t('report.publishing') : t('report.publish')}
          icon={publishing ? <ActivityIndicator color={colors.navy} /> : undefined}
          onPress={publishing ? undefined : publish}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  targetInput: { flex: 1, minWidth: 0, fontFamily: fonts.inter600, fontSize: 16 },
  action: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scan: { backgroundColor: colors.navy },
  counter: { alignSelf: 'flex-end', fontFamily: fonts.inter400, fontSize: 12, color: colors.textSecondary },
  error: { fontFamily: fonts.inter600, fontSize: 14, color: colors.dangerText, textAlign: 'center' },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  privacyText: { fontFamily: fonts.inter400, fontSize: 13, color: colors.textSecondary },
});
