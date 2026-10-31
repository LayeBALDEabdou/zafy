import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

type Circle = { size: number; color: string; top?: number; right?: number; bottom?: number; left?: number };

const variants = {
  /** Hero standard 190 px (accueil, ajouter, planifiés, alerte, profil). */
  default: [
    { size: 190, color: colors.turquoise, right: -50, top: -60 },
    { size: 150, color: colors.navy2, right: 50, bottom: -80 },
  ],
  /** Hero plein écran (envoi réussi, recevoir). */
  large: [
    { size: 190, color: colors.turquoise, right: -60, top: -60 },
    { size: 160, color: colors.navy2, left: -50, bottom: -60 },
  ],
  /** Hero compact des alertes. */
  compact: [{ size: 160, color: colors.turquoise, right: -40, top: -50 }],
} satisfies Record<string, Circle[]>;

type Props = {
  children: ReactNode;
  variant?: keyof typeof variants;
  style?: StyleProp<ViewStyle>;
};

export function HeroCard({ children, variant = 'default', style }: Props) {
  return (
    <View
      style={[
        styles.hero,
        variant === 'default' && styles.fixed,
        variant === 'large' && styles.large,
        variant === 'compact' && styles.compact,
        style,
      ]}>
      {variants[variant].map((c: Circle, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: c.size,
            height: c.size,
            borderRadius: c.size / 2,
            backgroundColor: c.color,
            top: c.top,
            right: c.right,
            bottom: c.bottom,
            left: c.left,
          }}
        />
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    overflow: 'hidden',
    backgroundColor: colors.navy,
    borderRadius: radius.hero,
    padding: 24,
  },
  fixed: { height: 190, justifyContent: 'space-between', flexShrink: 0 },
  large: {
    borderRadius: radius.heroLarge,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { height: 130, justifyContent: 'center', gap: 4 },
});
