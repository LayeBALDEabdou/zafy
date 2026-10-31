import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

type Props = {
  children: ReactNode;
  /** La dernière carte de l'écran prend la place restante. */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, fill, style }: Props) {
  return <View style={[styles.card, fill && styles.fill, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  fill: { flexGrow: 1 },
});
