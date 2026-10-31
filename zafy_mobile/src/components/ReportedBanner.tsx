import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useOwnReports } from '@/hooks/useOwnReports';
import { plural, t } from '@/i18n';
import { isPhoneTarget } from '@/lib/nostr';
import { colors, fonts } from '@/theme';

/** Prévient l'utilisateur que son numéro ou son adresse a été signalé sur Nostr. Rien si aucun signalement. */
export function ReportedBanner() {
  const { summaries } = useOwnReports();
  if (summaries.length === 0) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Icon name="alert" size={20} color={colors.white} strokeWidth={2.4} />
        </View>
        <Text style={styles.title}>{t('banner.reported')}</Text>
      </View>
      {summaries.map((s) => (
        <Pressable
          key={s.target}
          onPress={() => router.push({ pathname: '/alerte/[id]', params: { id: s.target } })}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
          <Text style={styles.rowText}>
            {t(plural(isPhoneTarget(s.target) ? 'banner.yourPhone' : 'banner.yourAccount', s.count), { n: s.count })}
          </Text>
          <Text style={styles.link}>{t('banner.see')}</Text>
          <Icon name="chevronRight" size={16} color={colors.dangerText} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.dangerBg, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dangerDot,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontFamily: fonts.inter700, fontSize: 15, color: colors.dangerText },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 48, minHeight: 32 },
  rowText: { flex: 1, fontFamily: fonts.inter500, fontSize: 14, color: colors.navy },
  link: { fontFamily: fonts.inter600, fontSize: 14, color: colors.dangerText },
});
