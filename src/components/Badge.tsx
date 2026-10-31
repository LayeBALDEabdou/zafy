import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

export type BadgeTone = 'success' | 'danger' | 'warning' | 'neutral';

const tones: Record<BadgeTone, { fg: string; bg: string }> = {
  success: { fg: colors.successText, bg: colors.successBg },
  danger: { fg: colors.dangerText, bg: colors.dangerBg },
  warning: { fg: colors.warningText, bg: colors.warningBg },
  neutral: { fg: colors.navy, bg: colors.neutralBg },
};

type Props = {
  label: string;
  tone?: BadgeTone;
  icon?: ReactNode;
  bold?: boolean;
  /** Padding vertical : 6 (montants) ou 7 (raisons). */
  py?: number;
};

export function Badge({ label, tone = 'success', icon, bold, py = 6 }: Props) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg, paddingVertical: py }]}>
      {icon}
      <Text style={[styles.text, { color: t.fg }, bold && { fontFamily: fonts.inter700 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  text: { fontFamily: fonts.inter600, fontSize: 13 },
});
