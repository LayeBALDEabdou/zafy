'use no memo'; // Dates et libellés traduits hors composant : recalculés à chaque rendu (changement de langue)

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { ChoiceGroup } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { TabTitle } from '@/components/ScreenHeader';
import { useContacts } from '@/hooks/useContacts';
import { plural, useT } from '@/i18n';
import { formatTarget, isPhoneTarget, recentReports, reportTypeLabel, type ReportSummary } from '@/lib/nostr';
import { colors, fonts } from '@/theme';
import { DAY_MS, formatAgo } from '@/utils/date';

const FILTERS = ['filterAll', 'filterPhones', 'filterAddresses'] as const;

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; summaries: ReportSummary[]; thisWeek: number };

/** Minuscules sans accents ni espaces superflus, pour une recherche tolérante. */
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Couleurs d'une alerte selon le nombre de personnes qui ont signalé. */
function severity(count: number) {
  if (count >= 5) return { bg: colors.dangerBg, fg: colors.dangerText };
  if (count >= 2) return { bg: colors.warningBg, fg: colors.warningText };
  return { bg: colors.neutralBg, fg: colors.navy };
}

/**
 * 08 — Alertes de la communauté (signalements Nostr des 30 derniers jours), volontairement simple :
 * une recherche, un choix Toutes / Numéros / Adresses, le nombre de la semaine, puis la liste.
 */
export default function Alertes() {
  const { t } = useT();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('filterAll');
  const [query, setQuery] = useState('');
  const [state, setState] = useState<State>({ status: 'loading' });
  const { find } = useContacts();

  const load = useCallback(() => {
    recentReports()
      .then(({ reports, summaries }) => {
        const weekAgo = Date.now() - 7 * DAY_MS;
        const thisWeek = new Set(reports.filter((r) => r.createdAt.getTime() >= weekAgo).map((r) => r.id)).size;
        setState({ status: 'ready', summaries, thisWeek });
      })
      // Déjà affichée : on garde la liste plutôt que de la remplacer par une erreur
      .catch(() => setState((s) => (s.status === 'ready' ? s : { status: 'error' })));
  }, []);

  useFocusEffect(load);

  const retry = () => {
    setState({ status: 'loading' });
    load();
  };

  const q = normalize(query.trim());
  const qDigits = query.replace(/\D/g, '');
  const list =
    state.status !== 'ready'
      ? []
      : state.summaries.filter((s) => {
          if (filter === 'filterPhones' && !isPhoneTarget(s.target)) return false;
          if (filter === 'filterAddresses' && isPhoneTarget(s.target)) return false;
          if (!q) return true;
          const contact = find(s.target);
          return (
            normalize(formatTarget(s.target)).includes(q) ||
            normalize(s.target).includes(q) ||
            (qDigits.length >= 3 && s.target.replace(/\D/g, '').includes(qDigits)) ||
            normalize(contact?.name ?? '').includes(q) ||
            s.types.some((type) => normalize(reportTypeLabel(type)).includes(q))
          );
        });

  return (
    <Screen tab header={<TabTitle>{t('alerts.title')}</TabTitle>}>
      <View style={styles.search}>
        <Icon name="search" size={20} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('alerts.search')}
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} accessibilityLabel={t('a11y.clearSearch')} hitSlop={8}>
            <Icon name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <ChoiceGroup
        options={FILTERS}
        value={filter}
        onChange={setFilter}
        columns={3}
        segmented
        style={styles.filters}
        getLabel={(f) => t(`alerts.${f}`)}
      />

      {state.status === 'ready' ? (
        <Text style={styles.summary}>{t(plural('alerts.weekCount', state.thisWeek), { n: state.thisWeek })}</Text>
      ) : null}

      {state.status === 'loading' ? (
        <ActivityIndicator color={colors.navy} style={styles.loading} />
      ) : state.status === 'error' ? (
        <View style={styles.empty}>
          <Icon name="alert" size={28} color={colors.warningText} />
          <Text style={styles.emptyText}>{t('alerts.relayError')}</Text>
          <Button title={t('common.retry')} variant="secondary" height={44} onPress={retry} />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <Icon name={q ? 'search' : 'shieldCheck'} size={28} color={q ? colors.textSecondary : colors.successText} />
          <Text style={styles.emptyText}>{q ? t('alerts.noMatch') : t('alerts.empty')}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {list.map((s, i) => (
            <AlertRow
              key={s.target}
              summary={s}
              name={find(s.target)?.name}
              last={i === list.length - 1}
            />
          ))}
        </View>
      )}

      <Button title={t('alerts.reportScam')} height={52} onPress={() => router.push('/signaler')} />
    </Screen>
  );
}

function AlertRow({ summary, name, last }: { summary: ReportSummary; name?: string; last: boolean }) {
  const { bg, fg } = severity(summary.count);
  const phone = isPhoneTarget(summary.target);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/alerte/[id]', params: { id: summary.target } })}
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && { opacity: 0.7 }]}>
      <View style={[styles.avatar, { backgroundColor: bg }]}>
        <Icon name={phone ? 'phone' : 'bolt'} size={18} color={fg} strokeWidth={2.2} />
      </View>
      <View style={styles.rowBody}>
        {/* Quelqu'un de ton annuaire : son nom d'abord */}
        <Text style={styles.name} numberOfLines={1}>
          {name ?? formatTarget(summary.target)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {reportTypeLabel(summary.types[0])} · {formatAgo(summary.last)}
        </Text>
      </View>
      <View style={[styles.count, { backgroundColor: bg }]}>
        <Icon name="user" size={13} color={fg} strokeWidth={2.4} />
        <Text style={[styles.countText, { color: fg }]}>{summary.count}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, minWidth: 0, color: colors.navy, fontFamily: fonts.inter500, fontSize: 15, padding: 0 },
  filters: { backgroundColor: colors.white },
  summary: { fontFamily: fonts.inter600, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  loading: { marginVertical: 32 },
  list: { backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.background },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.inter600, fontSize: 15, color: colors.navy },
  meta: { fontFamily: fonts.inter400, fontSize: 13, color: colors.textSecondary },
  count: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  countText: { fontFamily: fonts.inter700, fontSize: 13 },
  empty: {
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: { fontFamily: fonts.inter400, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
});
