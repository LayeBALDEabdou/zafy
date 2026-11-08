'use no memo'; // Dates et libellés traduits hors composant : recalculés à chaque rendu (changement de langue)

import { Link, router, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActivityRow } from '@/components/ActivityRow';
import { Card } from '@/components/Card';
import { Icon, type IconName } from '@/components/Icon';
import { LogoHorizontal, LogoMark } from '@/components/Logo';
import { ReportedBanner } from '@/components/ReportedBanner';
import { Screen } from '@/components/Screen';
import { CardButton, CardLabel, cardText, WalletCard } from '@/components/WalletCard';
import { useWallet } from '@/context/WalletContext';
import { useContacts } from '@/hooks/useContacts';
import { useCurrency } from '@/hooks/useCurrency';
import { useT } from '@/i18n';
import { IS_TESTNET } from '@/lib/breez';
import { colors, fonts } from '@/theme';
import { txTitle } from '@/utils/transaction';

const ACTIONS: { label: 'home.send' | 'home.receive' | 'home.verify' | 'home.plan'; icon: IconName; bg: string; fg: string; href: Href }[] = [
  { label: 'home.send', icon: 'send', bg: colors.navy, fg: colors.turquoise, href: '/envoyer' },
  { label: 'home.receive', icon: 'receive', bg: colors.turquoise, fg: colors.navy, href: '/recevoir' },
  { label: 'home.verify', icon: 'shieldCheck', bg: colors.successBg, fg: colors.successText, href: '/verifier' },
  { label: 'home.plan', icon: 'calendar', bg: colors.background, fg: colors.navy, href: '/planifier' },
];

/** 01 — Accueil */
export default function Accueil() {
  const { t } = useT();
  const { profile, status, error, balanceSats, transactions } = useWallet();
  const activity = transactions.slice(0, 4);
  const { find } = useContacts();
  const { format, secondary, secondaryCurrency } = useCurrency();

  return (
    <Screen
      tab
      header={
        <View style={styles.header}>
          <LogoHorizontal />
          <Pressable
            onPress={() => router.navigate('/profil')}
            accessibilityLabel={t('home.profile')}
            style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.name.charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>
      }>
      <WalletCard action={<CardButton icon="plus" title={t('home.add')} onPress={() => router.push('/ajouter')} />}>
        <LogoMark size={26} />

        <View>
          <View style={styles.labelRow}>
            <CardLabel>{t('home.balance')}</CardLabel>
            {IS_TESTNET ? <Text style={styles.testBadge}>{t('common.test')}</Text> : null}
          </View>
          {balanceSats === null ? (
            <ActivityIndicator color={colors.turquoise} style={styles.balanceLoading} />
          ) : (
            <Text style={cardText.big} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {format(balanceSats)}
            </Text>
          )}
        </View>

        <View>
          <CardLabel>{secondaryCurrency === 'SAT' ? t('home.inSats') : t('home.inFcfa')}</CardLabel>
          <Text style={cardText.value}>{balanceSats === null ? t('home.syncing') : secondary(balanceSats)}</Text>
        </View>
      </WalletCard>

      <ReportedBanner />

      <View style={styles.actions}>
        {ACTIONS.map((a) => (
          <Pressable key={a.label} onPress={() => router.navigate(a.href)} style={styles.action}>
            <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
              <Icon name={a.icon} size={18} color={a.fg} strokeWidth={2.2} />
            </View>
            <Text style={styles.actionLabel}>{t(a.label)}</Text>
          </Pressable>
        ))}
      </View>

      <Card fill style={styles.activity}>
        <View style={styles.activityHeader}>
          <Text style={styles.h2}>{t('home.activity')}</Text>
          <Link href="/transactions" style={styles.link}>
            {t('home.seeAll')}
          </Link>
        </View>
        {status === 'error' || (status === 'ready' && activity.length === 0) ? (
          <View style={styles.emptyBox}>
            <Text style={styles.empty}>
              {status === 'error'
                ? t('home.walletError', { error })
                : t('home.noActivity')}
            </Text>
          </View>
        ) : (
          // Lignes empilées depuis le haut : le rendu reste propre de 1 à 4 transactions.
          <View>
            {activity.map((a, i) => (
              <View key={a.id} style={[styles.row, i < activity.length - 1 && styles.rowDivider]}>
                <ActivityRow
                  label={find(a.counterparty)?.name ?? txTitle(a)}
                  dotColor={a.amount > 0 ? colors.turquoise : colors.navy}
                  value={`${a.amount > 0 ? '+' : '−'}${format(Math.abs(a.amount))}`}
                  tone={a.amount > 0 ? 'success' : 'danger'}
                  onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: a.id } })}
                />
              </View>
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.sora700, fontSize: 16, color: colors.turquoise },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  testBadge: {
    fontFamily: fonts.inter600,
    fontSize: 11,
    color: colors.turquoise,
    borderWidth: 1,
    borderColor: colors.outlineOnNavy,
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    height: 84,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: fonts.inter600, fontSize: 13, color: colors.navy },
  activity: { padding: 18, paddingHorizontal: 18 },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 },
  h2: { fontFamily: fonts.sora700, fontSize: 16, color: colors.navy },
  link: { fontFamily: fonts.inter600, fontSize: 13, color: colors.successText, textDecorationLine: 'underline' },
  row: { paddingVertical: 8 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.background },
  emptyBox: { flexGrow: 1, justifyContent: 'center' },
  empty: { fontFamily: fonts.inter400, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center', paddingVertical: 16 },
  balanceLoading: { alignSelf: 'flex-start', height: 42 },
});
