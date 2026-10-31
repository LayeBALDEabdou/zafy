import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { HeroCard } from '@/components/HeroCard';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { useCurrency } from '@/hooks/useCurrency';
import { useT } from '@/i18n';
import { IS_TESTNET } from '@/lib/breez';
import { colors, fonts } from '@/theme';

/** 03 — Envoi réussi */
export default function EnvoiOK() {
  const { t } = useT();
  const {
    amount = '0',
    to = '',
    fee = '0',
    name,
  } = useLocalSearchParams<{ amount?: string; to?: string; fee?: string; name?: string }>();
  const sats = Number(amount);
  const { format, secondary, secondaryCurrency } = useCurrency();
  const done = () => router.dismissTo('/accueil');

  return (
    <Screen>
      <HeroCard variant="large" style={styles.hero}>
        <View style={styles.check} accessibilityLabel={t('send.successA11y')}>
          <Icon name="check" size={46} color={colors.navy} strokeWidth={2.8} />
        </View>
        <Text style={styles.title}>{t('send.success')}</Text>
        <View style={styles.amountBlock}>
          <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
            {format(sats)}
          </Text>
          {name ? (
            <Text style={styles.to}>{t('send.toName', { name })}</Text>
          ) : to ? (
            <Text style={styles.to}>{t('send.via', { kind: to })}</Text>
          ) : null}
        </View>
      </HeroCard>

      <Card style={styles.details}>
        <DetailRow label={secondaryCurrency === 'SAT' ? t('home.inSats') : t('home.inFcfa')} value={secondary(sats)} />
        <DetailRow label={t('send.feeRow')} value={format(Number(fee))} />
        <DetailRow label={t('send.network')} value={IS_TESTNET ? t('send.networkTest') : t('send.networkBitcoin')} last />
      </Card>

      <View style={styles.buttons}>
        <Button title={t('send.done')} style={styles.flex} onPress={done} />
      </View>
    </Screen>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingVertical: 32, gap: 18, minHeight: 320 },
  check: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.turquoise,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.sora700, fontSize: 28, color: colors.white },
  amountBlock: { alignItems: 'center', gap: 4 },
  amount: { fontFamily: fonts.sora700, fontSize: 36, letterSpacing: -1, color: colors.white },
  to: { fontFamily: fonts.inter400, fontSize: 15, color: colors.textOnNavy },
  details: { paddingVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.background },
  rowLabel: { fontFamily: fonts.inter400, fontSize: 15, color: colors.textSecondary },
  rowValue: { fontFamily: fonts.inter600, fontSize: 15, color: colors.navy },
  buttons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
