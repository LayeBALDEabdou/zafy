import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { CurrencyIcon } from '@/components/CurrencyIcon';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCurrency } from '@/hooks/useCurrency';
import { useT } from '@/i18n';
import { CURRENCIES, formatIn, getCurrencyState } from '@/lib/currency';
import { colors, fonts } from '@/theme';
import { formatAgo } from '@/utils/date';

/** Choix de la devise d'affichage, pour toute l'app. */
export default function Devise() {
  const { t } = useT();
  const { currency, setCurrency, updatedAt } = useCurrency();
  const { prices } = getCurrencyState();

  return (
    <Screen header={<ScreenHeader title={t('currency.title')} />}>
      <Card style={styles.list}>
        {CURRENCIES.map((c, i) => {
          const active = c.code === currency;
          return (
            <Pressable
              key={c.code}
              onPress={() => {
                setCurrency(c.code);
                router.back();
              }}
              style={({ pressed }) => [styles.row, i < CURRENCIES.length - 1 && styles.divider, pressed && { opacity: 0.7 }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}>
              <CurrencyIcon currency={c.code} size={44} active={active} />
              <View style={styles.body}>
                <Text style={styles.label}>{t(`currency.${c.code}`)}</Text>
                {/* Exemple : ce que valent 10 000 sats dans cette devise */}
                <Text style={styles.example}>{t('currency.example', { value: formatIn(10_000, c.code, prices) })}</Text>
              </View>
              {active ? <Icon name="check" size={20} color={colors.successText} strokeWidth={2.6} /> : null}
            </Pressable>
          );
        })}
      </Card>
      <Text style={styles.note}>
        {t('currency.note')}{' '}
        {updatedAt ? t('currency.updated', { ago: formatAgo(new Date(updatedAt)) }) : t('currency.indicative')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 6, paddingHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.background },
  body: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.inter600, fontSize: 15, color: colors.navy },
  example: { fontFamily: fonts.inter400, fontSize: 13, color: colors.textSecondary },
  note: { fontFamily: fonts.inter400, fontSize: 13, lineHeight: 18, color: colors.textSecondary, textAlign: 'center' },
});
