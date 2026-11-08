'use no memo'; // Dates et libellés traduits hors composant : recalculés à chaque rendu (changement de langue)

import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Button, PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { HeroCard } from '@/components/HeroCard';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useWallet } from '@/context/WalletContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useContacts } from '@/hooks/useContacts';
import { useT } from '@/i18n';
import { contactPhone } from '@/lib/contacts';
import { prepareSend, sendPrepared } from '@/lib/breez';
import { confirmAction } from '@/lib/confirm';
import { advancePlan, deletePlan, describeSchedule, getPlan, isDue, planSats, type Plan } from '@/lib/plans';
import { colors, fonts } from '@/theme';
import { formatShortDate } from '@/utils/date';

const shorten = (s: string) => (s.length > 22 ? `${s.slice(0, 10)}…${s.slice(-6)}` : s);
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Confirmation d'un paiement planifié (depuis la liste ou le rappel). */
export default function PaiementPlanifie() {
  const { t } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status, balanceSats, refresh } = useWallet();
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);
  const [busy, setBusy] = useState<'send' | 'skip' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { find } = useContacts();
  const { format, formatFixed, secondary } = useCurrency();

  const reload = useCallback(() => {
    getPlan(id).then(setPlan);
  }, [id]);

  // Rechargé aussi au retour de « Modifier »
  useFocusEffect(reload);

  // Ouvert depuis le rappel alors que l'app est verrouillée : déverrouiller d'abord, puis revenir ici.
  if (status === 'locked') {
    return <Redirect href={{ pathname: '/connexion', params: { next: `/paiement-planifie?id=${id}` } }} />;
  }

  if (plan === undefined) {
    return (
      <Screen header={<ScreenHeader title={t('plans.detailTitle')} />}>
        <ActivityIndicator color={colors.navy} style={styles.loading} />
      </Screen>
    );
  }

  if (plan === null) {
    return (
      <Screen header={<ScreenHeader title={t('plans.detailTitle')} />}>
        <Text style={styles.missing}>{t('plans.gone')}</Text>
        <PrimaryButton title={t('plans.seeAll')} onPress={() => router.replace('/planifier')} />
      </Screen>
    );
  }

  const due = isDue(plan);
  const recurring = plan.frequency !== 'once';
  const contact = find(plan.destination);
  const recipientLabel = contact
    ? [contact.name, contactPhone(contact)].filter(Boolean).join(' · ')
    : shorten(plan.destination);

  const send = async () => {
    setError(null);
    // Montant en monnaie : converti au taux du jour
    const sats = planSats(plan);
    if (balanceSats !== null && sats > balanceSats) return setError(t('send.insufficient'));
    setBusy('send');
    try {
      // Relu juste avant l'envoi : il a pu être payé ou modifié depuis un autre écran
      const fresh = await getPlan(plan.id);
      if (!fresh || fresh.nextDate !== plan.nextDate) {
        setPlan(fresh);
        return setError(t('plans.alreadySent'));
      }
      const prepared = await prepareSend(plan.destination, sats);
      const ok = await confirmAction(
        t('send.confirmTitle', { amount: format(prepared.amountSats) }),
        t('plans.confirmMessage', { name: plan.name, fee: format(prepared.feeSats) }),
        t('common.send'),
        false,
        'send',
      );
      if (!ok) return;
      await sendPrepared(prepared);
      // Envoi réussi : passe à l'échéance suivante (ou supprime un paiement unique)
      await advancePlan(plan.id);
      refresh().catch(() => {});
      router.replace({
        pathname: '/envoi-ok',
        params: { amount: String(prepared.amountSats), to: plan.name, fee: String(prepared.feeSats) },
      });
    } catch (e) {
      setError(t('send.failed', { error: errorText(e) }));
    } finally {
      setBusy(null);
    }
  };

  const skip = async () => {
    setBusy('skip');
    await advancePlan(plan.id);
    setBusy(null);
    router.back();
  };

  const remove = async () => {
    if (!(await confirmAction(t('plans.deleteTitle'), t('plans.deleteNoRemind', { name: plan.name }), t('common.delete'), true))) return;
    setBusy('delete');
    await deletePlan(plan.id);
    setBusy(null);
    router.back();
  };

  return (
    <Screen header={<ScreenHeader title={t('plans.detailTitle')} />}>
      <HeroCard>
        {due ? (
          <Badge label={t('plans.toConfirm')} tone="warning" />
        ) : (
          <Text style={styles.heroLabel}>{t('plans.nextSend')}</Text>
        )}
        <View style={{ gap: 4 }}>
          <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
            {formatFixed(planSats(plan), plan.fiat)}
          </Text>
          <Text style={styles.heroSub} numberOfLines={1}>
            {plan.name} · {secondary(planSats(plan))}
          </Text>
        </View>
      </HeroCard>

      <Card fill style={styles.details}>
        <Row label={t('plans.recipient')} value={recipientLabel} />
        <Row label={t('plans.frequency')} value={describeSchedule(plan)} />
        <Row label={t('plans.dueDate')} value={due ? t('plans.now') : formatShortDate(new Date(plan.nextDate))} last />
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {recurring && due ? (
        <Button
          title={busy === 'skip' ? '…' : t('plans.skip')}
          variant="secondary"
          onPress={busy ? undefined : skip}
        />
      ) : null}

      <View style={styles.secondary}>
        <Button
          title={t('common.edit')}
          variant="secondary"
          style={styles.flex}
          onPress={busy ? undefined : () => router.push({ pathname: '/nouveau-plan', params: { id: plan.id } })}
        />
        <Button
          title={busy === 'delete' ? '…' : t('common.delete')}
          variant="danger"
          style={styles.flex}
          onPress={busy ? undefined : remove}
        />
      </View>

      <PrimaryButton
        title={busy === 'send' ? t('send.sending') : due ? t('plans.confirmSend') : t('plans.sendNow')}
        icon={busy === 'send' ? <ActivityIndicator color={colors.navy} /> : undefined}
        onPress={busy ? undefined : send}
      />
    </Screen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 40 },
  missing: { fontFamily: fonts.inter500, fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginTop: 24 },
  heroLabel: { fontFamily: fonts.inter400, fontSize: 14, color: colors.textOnNavy },
  heroSub: { fontFamily: fonts.inter400, fontSize: 15, color: colors.textOnNavy },
  amount: { fontFamily: fonts.sora700, fontSize: 34, letterSpacing: -1, color: colors.white },
  details: { paddingVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.background },
  rowLabel: { fontFamily: fonts.inter400, fontSize: 15, color: colors.textSecondary },
  rowValue: { flexShrink: 1, fontFamily: fonts.inter600, fontSize: 15, color: colors.navy, textAlign: 'right' },
  error: { fontFamily: fonts.inter600, fontSize: 14, color: colors.dangerText, textAlign: 'center' },
  secondary: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
