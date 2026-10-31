import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { HeroCard } from '@/components/HeroCard';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useContacts } from '@/hooks/useContacts';
import { useOwnReports } from '@/hooks/useOwnReports';
import { plural, useT } from '@/i18n';
import { contactPhone } from '@/lib/contacts';
import { formatTarget, isPhoneTarget, reportsFor, reportTypeLabel, type ReportSummary } from '@/lib/nostr';
import { colors, fonts } from '@/theme';
import { formatAgo, formatShortDate } from '@/utils/date';

/** 09 — Détail d'un numéro ou d'une adresse signalé (`id` = cible du signalement). */
export default function AlerteDetail() {
  const { t } = useT();
  const { id, published } = useLocalSearchParams<{ id: string; published?: string }>();
  const [summary, setSummary] = useState<ReportSummary | null | undefined>(undefined);
  const [error, setError] = useState(false);
  const own = useOwnReports().targets.includes(id);
  const contact = useContacts().find(id);

  const load = useCallback(() => {
    reportsFor(id)
      .then(setSummary)
      .catch(() => setError(true));
  }, [id]);

  useEffect(load, [load]);

  const header = <ScreenHeader title={t('alerts.detailTitle')} />;

  if (summary === undefined) {
    return (
      <Screen header={header}>
        {error ? (
          <View style={styles.center}>
            <Text style={styles.muted}>{t('alerts.relayErrorShort')}</Text>
            <Button
              title={t('common.retry')}
              variant="secondary"
              onPress={() => {
                setError(false);
                load();
              }}
            />
          </View>
        ) : (
          <ActivityIndicator color={colors.navy} style={styles.loading} />
        )}
      </Screen>
    );
  }

  const count = summary?.count ?? 0;

  return (
    <Screen header={header}>
      {published ? (
        <View style={styles.thanks}>
          <Icon name="check" size={18} color={colors.successText} strokeWidth={2.6} />
          <Text style={styles.thanksText}>{t('alerts.thanks')}</Text>
        </View>
      ) : null}

      <HeroCard>
        {summary ? <Text style={styles.tag}>{reportTypeLabel(summary.types[0])}</Text> : null}
        <View style={{ gap: 4 }}>
          <Text style={styles.target} numberOfLines={1} adjustsFontSizeToFit>
            {contact?.name ?? formatTarget(id)}
          </Text>
          {/* Contact de l'annuaire : son numéro (ou l'adresse signalée) pour savoir de qui il s'agit */}
          {contact ? (
            <Text style={styles.contactLine} numberOfLines={1}>
              {t('alerts.inContacts', { info: contactPhone(contact) ?? formatTarget(id) })}
            </Text>
          ) : null}
          <Text style={styles.count}>
            {count === 0 ? t('alerts.noReports') : t(plural('alerts.reportedBy', count), { n: count })}
          </Text>
        </View>
      </HeroCard>

      {summary ? (
        <>
          <Card style={styles.section}>
            <Text style={styles.h2}>{t('alerts.behaviors')}</Text>
            <View style={styles.chips}>
              {summary.types.map((type) => (
                <Badge key={type} label={reportTypeLabel(type)} tone="danger" py={7} />
              ))}
            </View>
          </Card>

          {summary.messages.length > 0 ? (
            <Card style={styles.section}>
              <Text style={styles.h2}>{t('alerts.messages')}</Text>
              {summary.messages.slice(0, 3).map((m, i) => (
                <Text key={i} style={styles.message} numberOfLines={4}>
                  « {m} »
                </Text>
              ))}
            </Card>
          ) : null}

          <Card fill style={styles.info}>
            <InfoRow label={t('alerts.lastReport')} value={formatAgo(summary.last)} />
            <InfoRow label={t('alerts.firstReport')} value={formatShortDate(summary.first)} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('alerts.source')}</Text>
              <Badge
                label={t(plural('alerts.signatures', count), { n: count })}
                icon={<Icon name="check" size={14} color={colors.successText} strokeWidth={2.6} />}
              />
            </View>
          </Card>
        </>
      ) : null}

      {own ? (
        <Card style={styles.section}>
          <Text style={styles.h2}>{isPhoneTarget(id) ? t('alerts.ownPhone') : t('alerts.ownAccount')}</Text>
          <Text style={styles.message}>
            {t('alerts.ownExplanation')}
          </Text>
        </Card>
      ) : !published ? (
        <Button
          title={count > 0 ? t('alerts.meToo') : t('alerts.report')}
          onPress={() => router.push({ pathname: '/signaler', params: { target: id } })}
        />
      ) : (
        <Button title={t('alerts.seeAlerts')} onPress={() => router.navigate('/alertes')} />
      )}
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 40 },
  center: { alignItems: 'stretch', gap: 16, marginTop: 24 },
  muted: { fontFamily: fonts.inter500, fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  thanks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.successBg,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  thanksText: { flex: 1, fontFamily: fonts.inter600, fontSize: 14, color: colors.successText },
  tag: {
    alignSelf: 'flex-start',
    fontFamily: fonts.inter700,
    fontSize: 13,
    color: colors.navy,
    backgroundColor: colors.coral,
    borderRadius: 10,
    overflow: 'hidden',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  target: { fontFamily: fonts.sora700, fontSize: 28, letterSpacing: -0.5, color: colors.white },
  count: { fontFamily: fonts.inter400, fontSize: 15, color: colors.textOnNavy },
  contactLine: { fontFamily: fonts.inter600, fontSize: 14, color: colors.turquoise },
  section: { gap: 12 },
  h2: { fontFamily: fonts.sora700, fontSize: 16, color: colors.navy },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  message: { fontFamily: fonts.inter400, fontSize: 14, lineHeight: 20, color: colors.navy },
  info: { paddingVertical: 6, justifyContent: 'space-around', gap: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontFamily: fonts.inter400, fontSize: 15, color: colors.textSecondary },
  infoValue: { fontFamily: fonts.inter600, fontSize: 15, color: colors.navy },
});
