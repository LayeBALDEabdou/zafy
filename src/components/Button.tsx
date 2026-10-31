import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius } from '@/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'dark' | 'muted' | 'danger';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  /** 56 par défaut ; 52 / 48 pour les boutons dans les cartes. */
  height?: number;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const variantStyles: Record<Variant, { container: ViewStyle; color: string; font: string; size: number }> = {
  primary: { container: { backgroundColor: colors.turquoise }, color: colors.navy, font: fonts.sora700, size: 16 },
  secondary: { container: { backgroundColor: colors.white }, color: colors.navy, font: fonts.inter600, size: 15 },
  outline: {
    container: { borderWidth: 2, borderColor: colors.outlineOnNavy },
    color: colors.white,
    font: fonts.sora600,
    size: 16,
  },
  dark: { container: { backgroundColor: colors.navy }, color: colors.white, font: fonts.inter600, size: 14 },
  muted: { container: { backgroundColor: colors.background }, color: colors.navy, font: fonts.inter600, size: 14 },
  danger: { container: { backgroundColor: colors.white }, color: colors.dangerText, font: fonts.inter600, size: 15 },
};

export function Button({ title, onPress, variant = 'primary', height = 56, icon, style }: Props) {
  const v = variantStyles[variant];
  const r = height >= 56 ? radius.button : height >= 52 ? 16 : radius.input;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        { height, borderRadius: r },
        v.container,
        pressed && { opacity: 0.8 },
        style,
      ]}>
      {icon}
      <Text style={{ color: v.color, fontFamily: v.font, fontSize: height < 56 && variant === 'primary' ? 15 : v.size }}>
        {title}
      </Text>
    </Pressable>
  );
}

export const PrimaryButton = (props: Omit<Props, 'variant'>) => <Button {...props} variant="primary" />;

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexShrink: 0,
  },
});
