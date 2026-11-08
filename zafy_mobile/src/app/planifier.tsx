'use no memo'; // Dates et libellés traduits hors composant : recalculés à chaque rendu (changement de langue)

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { HeroCard } from '@/components/HeroCard';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { useCurrency } from '@/hooks/useCurrency';
import { useT } from '@/i18n';
import { deletePlan, describeSchedule, isDue, loadPlans, planSats, type Plan } from '@/lib/plans';
import { colors, fonts } from '@/theme';
import { formatShortDate } from '@/utils/date';

// Couleurs des pastilles, attribuées dans l'ordre
const AVATARS = [
  { bg: colors.navy, fg: colors.turquoise },
  { bg: colors.turquoise, fg: colors.navy },
  { bg: colors.successBg, fg: colors.successText },
  { bg: colors.background, fg: colors.navy },
];

/** 10 — Paiements planifiés */
export default function Planifier() {
  const { t } = useT();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const { formatFixed } = useCurrency();

  // Recharge à chaque retour sur l'écran (après création, envoi ou suppression)
  useFocusEffect(
    useCallback(() => {
      loadPlans()
        .then(setPlans)
        .catch(() => setPlans([]));
    }, []),
  );

  const next = plans?.[0];
  const open = (id: string) => router.push({ pathname: '/paiement-planifie', params: { id } });
  const remove = async (plan: Plan) => {
    await deletePlan(plan.id);
    setPlans((list) => list?.filter((p) => p.id !== plan.id) ?? null);
  };

  return (
    <Screen header={<ScreenHeader title={t('plans.title')} />}>
      <HeroCard>
        <Text style={styles.heroLabel}>{t('plans.next')}</Text>
        {next ? (
          <View style={{ gap: 4 }}>
            <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
              {formatFixed(planSats(next), next.fiat)}
            </Text>
            <Text style={styles.heroSub}>
              {next.name} · {isDue(next) ? t('plans.confirmNow') : formatShortDate(new Date(next.nextDate))}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 4 }}>
            <Text style={styles.amount}>{t('plans.none')}</Text>
            <Text style={styles.heroSub}>{t('plans.noneHint')}</Text>
          </View>
        )}
      </HeroCard>

      <Card fill style={styles.list}>
        {plans && plans.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="calendar" size={28} color={colors.successText} />
            <Text style={styles.emptyText}>
              {t('plans.emptyText')}
            </Text>
          </View>
        ) : (
          plans?.map((p, i) => (
            <PlanRow
              key={p.id}
              plan={p}
              avatar={AVATARS[i % AVATARS.length]}
              divider={i < plans.length - 1}
              onPress={() => open(p.id)}
              amount={formatFixed(planSats(p), p.fiat)}
              onDelete={() => remove(p)}
            />
          ))
        )}
      </Card>
      {plans?.length ? <Text style={styles.hint}>{t('plans.swipeHint')}</Text> : null}

      <PrimaryButton
        title={t('plans.new')}
        icon={<Icon name="plus" size={18} color={colors.navy} strokeWidth={2.4} />}
        onPress={() => router.push('/nouveau-plan')}
      />
    </Screen>
  );
}

/** Ligne de la liste : glisser vers la gauche pour supprimer (après confirmation). */
function PlanRow({
  plan,
  avatar,
  divider,
  amount,
  onPress,
  onDelete,
}: {
  plan: Plan;
  /** Montant déjà mis en forme dans la devise choisie. */
  amount: string;
  avatar: (typeof AVATARS)[number];
  divider: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { t } = useT();
  return (
    <SwipeToDelete
      title={t('plans.deleteTitle')}
      message={t('plans.deleteMessage', { name: plan.name })}
      onDelete={onDelete}
      style={divider && styles.rowDivider}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
        <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
          <Text style={[styles.avatarText, { color: avatar.fg }]}>{plan.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.name} numberOfLines={1}>
            {plan.name}
          </Text>
          <Text style={styles.schedule}>{describeSchedule(plan)}</Text>
        </View>
        {isDue(plan) ? (
          <Badge label={t('plans.due')} tone="warning" />
        ) : (
          <Text style={styles.rowAmount}>{amount}</Text>
        )}
      </Pressable>
    </SwipeToDelete>
  );
}

const styles = StyleSheet.create({
  heroLabel: { fontFamily: fonts.inter400, fontSize: 14, color: colors.textOnNavy },
  heroSub: { fontFamily: fonts.inter400, fontSize: 15, color: colors.textOnNavy },
  amount: { fontFamily: fonts.sora700, fontSize: 34, letterSpacing: -1, color: colors.white },
  list: { paddingVertical: 8, paddingHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.background },
  hint: { fontFamily: fonts.inter400, fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: -6 },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.sora700, fontSize: 16 },
  rowBody: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.inter600, fontSize: 15, color: colors.navy },
  schedule: { fontFamily: fonts.inter400, fontSize: 13, color: colors.textSecondary },
  rowAmount: { fontFamily: fonts.inter700, fontSize: 14, color: colors.navy },
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 24 },
  emptyText: { fontFamily: fonts.inter400, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
});
