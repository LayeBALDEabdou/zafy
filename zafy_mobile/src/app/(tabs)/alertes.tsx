import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ActivityRow } from '@/components/ActivityRow';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FilterChips } from '@/components/FilterChips';
import { HeroCard } from '@/components/HeroCard';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { TabTitle } from '@/components/ScreenHeader';
import { useContacts } from '@/hooks/useContacts';
import {
  formatTarget,
  isPhoneTarget,
  recentReports,
  reportTone,
  reportTypeLabel,
  type ReportSummary,
} from '@/lib/nostr';
import { useT } from '@/i18n';
import { colors, fonts } from '@/theme';
import { DAY_MS } from '@/utils/date';

const FILTERS = ['filterAll', 'filterPhones', 'filterAddresses'] as const;

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; summaries: ReportSummary[]; thisWeek: number };

/** 08 — Alertes communautaires (signalements Nostr des 30 derniers jours) */
export default function Alertes() {
  const { t } = useT();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('filterAll');
  const [state, setState] = useState<State>({ status: 'loading' });
  const { find } = useContacts();

  useFocusEffect(
    useCallback(() => {
      recentReports()
        .then(({ reports, summaries }) => {
          const weekAgo = Date.now() - 7 * DAY_MS;
          const thisWeek = new Set(reports.filter((r) => r.createdAt.getTime() >= weekAgo).map((r) => r.id)).size;
          setState({ status: 'ready', summaries, thisWeek });
        })
        .catch(() => setState((s) => (s.status === 'ready' ? s : { status: 'error' })));
    }, []),
  );

  const list =
    state.status !== 'ready'
      ? []
      : state.summaries.filter((s) =>
          filter === 'filterAll' ? true : filter === 'filterPhones' ? isPhoneTarget(s.target) : !isPhoneTarget(s.target),
        );

  return (
    <Screen tab header={<TabTitle>{t('alerts.title')}</TabTitle>}>
      <HeroCard variant="compact">
        <Text style={styles.count}>{state.status === 'ready' ? state.thisWeek : '…'}</Text>
        <Text style={styles.countLabel}>{t('alerts.thisWeek')}</Text>
      </HeroCard>

      <FilterChips options={FILTERS} value={filter} onChange={setFilter} getLabel={(f) => t(`alerts.${f}`)} />

      <Card fill style={styles.list}>
        {state.status === 'loading' ? (
          <ActivityIndicator color={colors.navy} style={styles.center} />
        ) : state.status === 'error' ? (
          <Empty text={t('alerts.relayError')} />
        ) : list.length === 0 ? (
          <Empty text={t('alerts.empty')} />
        ) : (
          list.map((s) => {
            const { tone, dot } = reportTone(s.count);
            // Quelqu'un de ton annuaire : on affiche son nom
            const contact = find(s.target);
            return (
              <ActivityRow
                key={s.target}
                label={
                  contact
                    ? t('alerts.rowContact', { type: reportTypeLabel(s.types[0]), name: contact.name })
                    : t('alerts.row', { type: reportTypeLabel(s.types[0]), target: formatTarget(s.target) })
                }
                dotColor={dot}
                value={String(s.count)}
                tone={tone}
                bold
                onPress={() => router.push({ pathname: '/alerte/[id]', params: { id: s.target } })}
              />
            );
          })
        )}
      </Card>

      <Button title={t('alerts.reportScam')} height={52} onPress={() => router.push('/signaler')} />
    </Screen>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Icon name="shieldCheck" size={28} color={colors.successText} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  count: { fontFamily: fonts.sora700, fontSize: 34, color: colors.white },
  countLabel: { fontFamily: fonts.inter400, fontSize: 14, color: colors.textOnNavy },
  list: { paddingVertical: 8, paddingHorizontal: 18, justifyContent: 'space-around' },
  center: { marginVertical: 24 },
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 24 },
  emptyText: { fontFamily: fonts.inter400, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
});
