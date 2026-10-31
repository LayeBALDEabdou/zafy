import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input, Label, TextArea } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { analyzeMessage, type ScamVerdict } from '@/data/mock';
import { useT } from '@/i18n';
import { colors, fonts } from '@/theme';

const VERDICTS = {
  arnaque: { label: 'verify.scam', fg: colors.dangerText, bg: colors.dangerBg, icon: 'alert' },
  suspect: { label: 'verify.suspect', fg: colors.warningText, bg: colors.warningBg, icon: 'alert' },
  sur: { label: 'verify.safe', fg: colors.successText, bg: colors.successBg, icon: 'check' },
} as const;

/** 06 — Vérifier (analyse IA) */
export default function Verifier() {
  const { t } = useT();
  const [sender, setSender] = useState('+221 77 412 08 12');
  const [message, setMessage] = useState(() => t('verify.sampleMessage'));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScamVerdict | null>(null);

  const analyze = async () => {
    setLoading(true);
    setResult(await analyzeMessage(sender, message));
    setLoading(false);
  };

  const v = result ? VERDICTS[result.verdict] : null;

  return (
    <Screen tab header={<ScreenHeader title={t('verify.title')} backTo="/accueil" />}>
      <Card fill style={styles.form}>
        <View style={styles.field}>
          <Label>{t('verify.sender')}</Label>
          <Input value={sender} onChangeText={setSender} keyboardType="phone-pad" style={{ height: 48 }} />
        </View>
        <Label>{t('verify.message')}</Label>
        <TextArea value={message} onChangeText={setMessage} />
        <Button
          title={loading ? t('verify.analyzing') : t('verify.analyze')}
          height={52}
          onPress={analyze}
          icon={loading ? <ActivityIndicator color={colors.navy} /> : undefined}
        />
      </Card>

      {result && v ? (
        <Animated.View key={`${result.verdict}-${result.raisons.join()}`} entering={FadeInDown.duration(280)}>
        <Card style={styles.result}>
          <View style={styles.verdictRow}>
            <View style={[styles.verdictIcon, { backgroundColor: v.bg }]}>
              <Icon name={v.icon} size={22} color={v.fg} strokeWidth={2.4} />
            </View>
            <Text style={[styles.verdict, { color: v.fg }]}>{t(v.label)}</Text>
          </View>
          {result.raisons.length > 0 ? (
            <View style={styles.reasons}>
              {result.raisons.map((r) => (
                <Badge key={r} label={t(r)} tone={result.verdict === 'arnaque' ? 'danger' : 'warning'} py={7} />
              ))}
            </View>
          ) : null}
          {result.verdict !== 'sur' ? (
            <View style={styles.buttons}>
              <Button
                title={t('verify.report')}
                variant="dark"
                height={48}
                style={styles.flex}
                onPress={() => router.push({ pathname: '/signaler', params: { target: sender, message } })}
              />
              <Button title={t('verify.block')} variant="muted" height={48} style={styles.flex} />
            </View>
          ) : null}
        </Card>
        </Animated.View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { padding: 18, paddingHorizontal: 18, gap: 12 },
  field: { gap: 8 },
  result: { padding: 18, paddingHorizontal: 18, gap: 14 },
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  verdictIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  verdict: { fontFamily: fonts.sora700, fontSize: 18 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  buttons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
