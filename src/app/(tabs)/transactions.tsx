import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge } from '@/components/Badge';
import { DateRangePicker, type DateRange } from '@/components/DateRangePicker';
import { Chip, FilterChips } from '@/components/FilterChips';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useWallet } from '@/context/WalletContext';
import { useContacts } from '@/hooks/useContacts';
import { type Transaction } from '@/data/mock';
import { useCurrency } from '@/hooks/useCurrency';
import { t, useT } from '@/i18n';
import { contactPhone, type Contact } from '@/lib/contacts';
import { colors, fonts, spacing } from '@/theme';
import { daysAgo, endOfDay, formatDay, formatShortDate, formatTime, isSameDay, startOfDay } from '@/utils/date';
import { txNote, txTitle } from '@/utils/transaction';

const TYPES = ['all', 'received', 'sent'] as const;
const PERIODS = ['anyTime', 'today', 'days7', 'days30'] as const;

const MAX_DAYS: Record<(typeof PERIODS)[number], number> = {
  anyTime: Infinity,
  today: 0,
  days7: 6,
  days30: 29,
};

/** Minuscules sans accents, pour une recherche tolérante (« medina » trouve « Médina »). */
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

function groupByDay(list: Transaction[]) {
  const sections: { title: string; data: Transaction[] }[] = [];
  for (const tx of list) {
    const title = formatDay(tx.date);
    const last = sections.at(-1);
    if (last?.title === title) last.data.push(tx);
    else sections.push({ title, data: [tx] });
  }
  return sections;
}

/** Historique complet : recherche, filtre reçues / envoyées et par période. */
export default function Transactions() {
  // Réaffiche l'écran quand la langue change (et la liste, via extraData)
  const { language } = useT();
  const { transactions } = useWallet();
  const { find } = useContacts();
  const { format } = useCurrency();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]>('all');
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>('anyTime');
  // Plage du calendrier : remplace la période quand elle est définie.
  const [range, setRange] = useState<DateRange | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const q = normalize(query.trim());
  const qDigits = query.replace(/\D/g, '');
  const filtered = transactions.filter((tx) => {
    if (type === 'received' && tx.amount < 0) return false;
    if (type === 'sent' && tx.amount > 0) return false;
    if (range) {
      if (tx.date < startOfDay(range.start) || tx.date > endOfDay(range.end)) return false;
    } else if (daysAgo(tx.date) > MAX_DAYS[period]) return false;
    if (!q) return true;
    const contact = find(tx.counterparty);
    return (
      normalize(txTitle(tx)).includes(q) ||
      normalize(contact?.name ?? '').includes(q) ||
      (qDigits.length > 0 && (contact?.phone ?? '').replace(/\D/g, '').includes(qDigits)) ||
      normalize(txNote(tx)).includes(q) ||
      (qDigits.length > 0 && String(Math.abs(tx.amount)).includes(qDigits))
    );
  });

  const received = filtered.reduce((sum, tx) => (tx.amount > 0 ? sum + tx.amount : sum), 0);
  const sent = filtered.reduce((sum, tx) => (tx.amount < 0 ? sum - tx.amount : sum), 0);

  const header = (
    <View style={styles.header}>
      <ScreenHeader title={t('history.title')} />

      <View style={styles.search}>
        <Icon name="search" size={20} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('history.search')}
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} accessibilityLabel={t('a11y.clearSearch')} hitSlop={8}>
            <Icon name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filters}>
        <FilterChips options={TYPES} value={type} onChange={setType} getLabel={(o) => t(`history.${o}`)} />
        <FilterChips
          options={PERIODS}
          getLabel={(o) => t(`history.${o}`)}
          value={range ? null : period}
          onChange={(p) => {
            setRange(null);
            setPeriod(p);
          }}
          leading={
            <Chip
              label={rangeLabel(range)}
              active={!!range}
              onPress={() => setCalendarOpen(true)}
              icon={<Icon name="calendar" size={16} color={range ? colors.turquoise : colors.navy} />}
            />
          }
        />
      </View>

      <View style={styles.summary}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t('history.totalReceived')}</Text>
          <Text style={[styles.statValue, { color: colors.successText }]}>+{format(received)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t('history.totalSent')}</Text>
          <Text style={[styles.statValue, { color: colors.dangerText }]}>−{format(sent)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar style="dark" />
      <SectionList
        sections={groupByDay(filtered)}
        keyExtractor={(tx) => tx.id}
        extraData={`${language}-${format(1)}`}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        renderSectionHeader={({ section }) => <Text style={styles.day}>{section.title}</Text>}
        renderItem={({ item, index, section }) => (
          <TransactionRow
            tx={item}
            contact={find(item.counterparty)}
            amount={format(Math.abs(item.amount))}
            first={index === 0}
            last={index === section.data.length - 1}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="search" size={28} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>{t('history.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('history.emptyText')}</Text>
          </View>
        }
      />

      <DateRangePicker
        visible={calendarOpen}
        value={range}
        onClose={() => setCalendarOpen(false)}
        onApply={(r) => {
          setRange(r);
          setCalendarOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

function rangeLabel(range: DateRange | null) {
  if (!range) return t('history.dates');
  if (isSameDay(range.start, range.end)) return formatShortDate(range.start);
  return `${formatShortDate(range.start)} → ${formatShortDate(range.end)}`;
}

function TransactionRow({
  tx,
  contact,
  amount,
  first,
  last,
}: {
  tx: Transaction;
  /** Montant déjà mis en forme dans la devise choisie. */
  amount: string;
  /** Destinataire reconnu dans l'annuaire : son nom et son numéro remplacent le type de paiement. */
  contact: Contact | null;
  first: boolean;
  last: boolean;
}) {
  const inbound = tx.amount > 0;
  const phone = contact ? contactPhone(contact) : null;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
      style={({ pressed }) => [
        styles.row,
        first && styles.rowFirst,
        last && styles.rowLast,
        !last && styles.rowDivider,
        pressed && { opacity: 0.7 },
      ]}>
      {contact ? (
        <View style={[styles.avatar, styles.contactAvatar]}>
          <Text style={styles.contactInitial}>{contact.name.charAt(0).toUpperCase()}</Text>
        </View>
      ) : (
        <View style={[styles.avatar, { backgroundColor: inbound ? colors.successBg : colors.background }]}>
          <Icon
            name={inbound ? 'receive' : 'send'}
            size={18}
            color={inbound ? colors.successText : colors.navy}
            strokeWidth={2.2}
          />
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>
          {contact?.name ?? txTitle(tx)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatTime(tx.date)}
          {phone ? ` · ${phone}` : ''}
          {txNote(tx) ? ` · ${txNote(tx)}` : ''}
        </Text>
      </View>
      <Badge
        label={`${inbound ? '+' : '−'}${amount}`}
        tone={inbound ? 'success' : 'danger'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingTop: spacing.screenTop,
    paddingHorizontal: spacing.screenX,
    paddingBottom: spacing.screenTop,
  },
  header: { gap: 16 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: colors.navy,
    fontFamily: fonts.inter500,
    fontSize: 15,
    padding: 0,
  },
  filters: { gap: 8 },
  summary: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, gap: 2 },
  statLabel: { fontFamily: fonts.inter500, fontSize: 13, color: colors.textSecondary },
  statValue: { fontFamily: fonts.sora700, fontSize: 18 },
  day: {
    fontFamily: fonts.sora700,
    fontSize: 15,
    color: colors.navy,
    paddingTop: 24,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowFirst: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16 },
  rowLast: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingBottom: 16 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.background },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  contactAvatar: { backgroundColor: colors.turquoise, borderRadius: 20 },
  contactInitial: { fontFamily: fonts.sora700, fontSize: 15, color: colors.navy },
  rowBody: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.inter600, fontSize: 15, color: colors.navy },
  meta: { fontFamily: fonts.inter400, fontSize: 13, color: colors.textSecondary },
  empty: {
    marginTop: 24,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontFamily: fonts.sora700, fontSize: 16, color: colors.navy },
  emptyText: { fontFamily: fonts.inter400, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
