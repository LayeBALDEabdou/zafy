import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { Currency } from '@/lib/currency';
import { colors } from '@/theme';

const ICONS: Record<Currency, number> = {
  XOF: require('@/assets/images/devises/cfa.png'),
  EUR: require('@/assets/images/devises/euro.png'),
  USD: require('@/assets/images/devises/dollar.png'),
  SAT: require('@/assets/images/devises/sats.png'),
};

/** Icône d'une devise dans une pastille claire (bordure turquoise quand elle est choisie). */
export function CurrencyIcon({ currency, size = 40, active }: { currency: Currency; size?: number; active?: boolean }) {
  // L'euro est un carré plein : il remplit la pastille ; les autres symboles gardent une marge
  const full = currency === 'EUR';
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size * 0.35 },
        active && styles.active,
      ]}>
      <Image
        source={ICONS[currency]}
        style={{ width: full ? size : size * 0.7, height: full ? size : size * 0.7 }}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  active: { borderColor: colors.turquoise },
});
