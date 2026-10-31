import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HeroCard } from '@/components/HeroCard';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useT } from '@/i18n';
import { colors, fonts } from '@/theme';

/** 05 — Ajouter des sats */
export default function Ajouter() {
  const { t } = useT();
  return (
    <Screen header={<ScreenHeader title={t('add.title')} />}>
      <Pressable onPress={() => router.replace('/recevoir')}>
        <HeroCard>
          <View style={styles.heroIcon}>
            <Icon name="receive" size={22} color={colors.navy} strokeWidth={2.2} />
          </View>
          <View style={styles.heroBottom}>
            <View style={{ gap: 4 }}>
              <Text style={styles.heroTitle}>{t('add.receive')}</Text>
              <Text style={styles.heroSub}>{t('add.receiveSub')}</Text>
            </View>
            <Icon name="chevronRight" size={22} color={colors.white} />
          </View>
        </HeroCard>
      </Pressable>

      <View style={styles.options}>
        <Option icon="phone" iconBg={colors.navy} iconFg={colors.turquoise} title={t('add.buy')} soon>
          <Text style={styles.sub}>{t('add.buySub')}</Text>
          <View style={styles.operators}>
            {OPERATORS.map((o) => (
              <View key={o.name} style={styles.operator} accessibilityLabel={o.name}>
                <Image source={o.logo} style={styles.operatorLogo} contentFit="contain" />
              </View>
            ))}
          </View>
        </Option>
        <Option
          icon="flask"
          iconBg={colors.background}
          iconFg={colors.navy}
          title={t('add.testSats')}
          onPress={() => router.push('/sats-test')}>
          <Text style={styles.sub}>{t('add.testSatsSub')}</Text>
        </Option>
      </View>

      <View style={styles.notice}>
        <View style={styles.noticeIcon}>
          <Icon name="shieldCheck" size={18} color={colors.successText} />
        </View>
        <Text style={styles.noticeText}>{t('add.notice')}</Text>
      </View>
    </Screen>
  );
}

function Option({
  icon,
  iconBg,
  iconFg,
  title,
  children,
  onPress,
  soon,
}: {
  icon: IconName;
  iconBg: string;
  iconFg: string;
  title: string;
  children: ReactNode;
  onPress?: () => void;
  /** Fonction pas encore disponible : badge « Bientôt », non cliquable. */
  soon?: boolean;
}) {
  const { t } = useT();
  return (
    <Pressable
      onPress={onPress}
      disabled={soon}
      accessibilityState={{ disabled: soon }}
      style={({ pressed }) => [styles.option, pressed && { opacity: 0.8 }]}>
      <View style={[styles.optionIcon, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={22} color={iconFg} />
      </View>
      <View style={styles.optionBody}>
        <Text style={styles.optionTitle}>{title}</Text>
        {children}
      </View>
      {soon ? (
        <Text style={styles.soon}>{t('common.soon')}</Text>
      ) : (
        <Icon name="chevronRight" size={20} color={colors.textSecondary} />
      )}
    </Pressable>
  );
}

const OPERATORS = [
  { name: 'Wave', logo: require('@/assets/images/operateurs/wave.png') },
  { name: 'Orange Money', logo: require('@/assets/images/operateurs/orange_money.png') },
  { name: 'Yas', logo: require('@/assets/images/operateurs/yas.png') },
];

const styles = StyleSheet.create({
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.turquoise,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  heroTitle: { fontFamily: fonts.sora700, fontSize: 24, color: colors.white },
  heroSub: { fontFamily: fonts.inter400, fontSize: 15, color: colors.textOnNavy },
  options: { gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
  },
  optionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  optionBody: { flex: 1, gap: 6 },
  optionTitle: { fontFamily: fonts.sora700, fontSize: 16, color: colors.navy },
  sub: { fontFamily: fonts.inter400, fontSize: 14, color: colors.textSecondary },
  operators: { flexDirection: 'row', gap: 8, marginTop: 2 },
  operator: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.neutralBg,
    backgroundColor: colors.white,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  operatorLogo: { width: '100%', height: '100%' },
  soon: {
    fontFamily: fonts.inter600,
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.background,
    borderRadius: 10,
    overflow: 'hidden',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  noticeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: { flex: 1, fontFamily: fonts.inter500, fontSize: 14, color: colors.navy },
});
