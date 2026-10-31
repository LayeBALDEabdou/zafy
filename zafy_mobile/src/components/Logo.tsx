import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { colors, fonts } from '@/theme';

type MarkProps = {
  size: number;
  /** Couleur du cadre et des barres. */
  color?: string;
  /** Couleur de la 2e barre (turquoise foncé sur fond clair). */
  accent?: string;
  strokeWidth?: number;
};

export function LogoMark({ size, color = colors.turquoise, accent, strokeWidth = 6 }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect x="4" y="4" width="92" height="92" fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Rect x="20" y="20" width="60" height="12" fill={color} />
      <Rect x="40" y="36" width="40" height="12" fill={accent ?? color} />
      <Rect x="20" y="52" width="40" height="12" fill={color} />
      <Rect x="20" y="68" width="60" height="12" fill={color} />
    </Svg>
  );
}

/** Logo horizontal sur fond clair (en-tête de l'accueil). */
export function LogoHorizontal() {
  return (
    <View style={styles.row}>
      <LogoMark size={28} color={colors.navy} accent={colors.turquoiseDark} strokeWidth={7} />
      <Text style={styles.word}>zafy</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  word: { fontFamily: fonts.sora700, fontSize: 21, letterSpacing: -0.5, color: colors.navy },
});
