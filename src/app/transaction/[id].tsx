import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Button, PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { HeroCard } from '@/components/HeroCard';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useWallet } from '@/context/WalletContext';
import { useContacts } from '@/hooks/useContacts';
import { useCurrency } from '@/hooks/useCurrency';
import { useT } from '@/i18n';
import { confirmAction } from '@/lib/confirm';
import { contactPhone } from '@/lib/contacts';
import { colors, fonts } from '@/theme';
import { formatDay, formatTime } from '@/utils/date';
import { txTitle } from '@/utils/transaction';

const shorten = (s: string, start = 10, end = 6) => (s.length > start + end + 1 ? `${s.slice(0, start)}…${s.slice(-end)}` : s);

/** Détail d'une transaction, avec suppression de l'historique (sur ce téléphone seulement). */
export default function TransactionDetail() {
  const { t } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, hideTransaction } = useWallet();
  const { find } = useContacts();
  const { format, secondary } = useCurrency();
  const [copied, setCopied] = useState(false);

  const tx = transactions.find((x) => x.id === id);
  const header = <ScreenHeader title={t('txDetail.title')} />;

  if (!tx) {
    return (
      <Screen header={header}>
        <Text style={styles.missing}>{t('txDetail.notFound')}</Text>
        <PrimaryButton title={t('txDetail.back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  const inbound = tx.amount > 0;
  const sats = Math.abs(tx.amount);
  const contact = find(tx.counterparty);
  const recipient = contact
    ? [contact.name, contactPhone(contact)].filter(Boolean).join(' · ')
    : tx.counterparty
      ? shorten(tx.counterparty)
      : null;

  const copyReference = async () => {
    await Clipboard.setStringAsync(tx.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const remove = async () => {
    if (!(await confirmAction(t('txDetail.deleteTitle'), t('txDetail.deleteMessage'), t('common.delete'), true))) return;
    await hideTransaction(tx.id);
    router.back();
  };

  return (
    <Screen header={header}>
      <HeroCard>
        <View style={[styles.direction, { backgroundColor: inbound ? colors.turquoise : colors.navy2 }]}>
          <Icon
            name={inbound ? 'receive' : 'send'}
            size={22}
            color={inbound ? colors.navy : colors.turquoise}
            strokeWidth={2.4}
          />
        </View>
        <View style={{ gap: 4 }}>
          <Text style={styles.heroLabel}>{inbound ? t('txDetail.received') : t('txDetail.sent')}</Text>
          <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
            {inbound ? '+' : '−'}
            {format(sats)}
          </Text>
          <Text style={styles.heroSub}>{secondary(sats)}</Text>
        </View>
      </HeroCard>

      <Card fill style={styles.details}>
        <Row label={t('txDetail.type')} value={txTitle(tx)} />
        <View style={[styles.row, styles.divider]}>
          <Text style={styles.rowLabel}>{t('txDetail.status')}</Text>
          <Badge
            label={tx.status ? t(`tx.${tx.status}`) : t('txDetail.statusDone')}
            tone={tx.status === 'failed' ? 'danger' : tx.status === 'pending' ? 'warning' : 'success'}
          />
        </View>
        <Row label={t('txDetail.date')} value={t('txDetail.dateValue', { day: formatDay(tx.date), time: formatTime(tx.date) })} />
        {!inbound ? <Row label={t('txDetail.fee')} value={format(tx.feeSats)} /> : null}
        {recipient ? <Row label={t('txDetail.recipient')} value={recipient} /> : null}
        {tx.description ? <Row label={t('txDetail.message')} value={tx.description} /> : null}
        <Pressable onPress={copyReference} style={styles.row} accessibilityLabel={t('txDetail.reference')}>
          <Text style={styles.rowLabel}>{t('txDetail.reference')}</Text>
          <View style={styles.reference}>
            <Text style={styles.rowValue} numberOfLines={1}>
              {copied ? t('txDetail.referenceCopied') : shorten(tx.id, 8, 6)}
            </Text>
            <Icon name={copied ? 'check' : 'copy'} size={16} color={colors.textSecondary} />
          </View>
        </Pressable>
      </Card>

      <View style={styles.buttons}>
        {/* Adresse inconnue de l'annuaire : on peut la signaler en cas d'arnaque */}
        {tx.counterparty && !contact ? (
          <Button
            title={t('txDetail.reportRecipient')}
            variant="secondary"
            style={styles.flex}
            onPress={() => router.push({ pathname: '/signaler', params: { target: tx.counterparty } })}
          />
        ) : null}
        <Button title={t('txDetail.delete')} variant="danger" style={styles.flex} onPress={remove} />
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.row, styles.divider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  missing: { fontFamily: fonts.inter500, fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginTop: 24 },
  direction: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroLabel: { fontFamily: fonts.inter400, fontSize: 14, color: colors.textOnNavy },
  amount: { fontFamily: fonts.sora700, fontSize: 34, letterSpacing: -1, color: colors.white },
  heroSub: { fontFamily: fonts.inter400, fontSize: 15, color: colors.textOnNavy },
  details: { paddingVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.background },
  rowLabel: { fontFamily: fonts.inter400, fontSize: 15, color: colors.textSecondary },
  rowValue: { flexShrink: 1, fontFamily: fonts.inter600, fontSize: 15, color: colors.navy, textAlign: 'right' },
  reference: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  buttons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
