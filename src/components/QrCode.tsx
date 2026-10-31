import qrcodeGenerator from 'qrcode-generator';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

/** Taille commune à tous les QR de l'app (cadre compris). */
export const QR_SIZE = 236;

/**
 * QR code réel dans un cadre blanc arrondi. Correction d'erreur « H » (30 %) pour rester
 * lisible malgré le logo Zafy posé au centre. La taille extérieure est toujours la même :
 * un contenu plus long (facture) donne juste des carrés plus fins.
 */
export function QrCode({ value, size = QR_SIZE, style }: { value: string; size?: number; style?: StyleProp<ViewStyle> }) {
  const qr = qrcodeGenerator(0, 'H');
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();

  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  }

  // Logo : ~20 % de la largeur, centré
  const logo = Math.round(n * 0.2);
  const start = (n - logo) / 2;

  // Marge blanche autour du code (zone calme nécessaire à la lecture)
  const padding = Math.round(size * 0.07);

  return (
    <View style={[styles.frame, { width: size, height: size, padding, borderRadius: Math.round(size * 0.09) }, style]}>
      <Svg width={size - padding * 2} height={size - padding * 2} viewBox={`0 0 ${n} ${n}`}>
        <Path fill={colors.navy} d={d} />
        <Rect x={start - 0.6} y={start - 0.6} width={logo + 1.2} height={logo + 1.2} rx={1.2} fill={colors.white} />
        <Rect x={start} y={start} width={logo} height={logo} rx={1} fill={colors.navy} />
        <G transform={`translate(${start + logo * 0.15} ${start + logo * 0.15}) scale(${(logo * 0.7) / 100})`}>
          <Rect x={4} y={4} width={92} height={92} fill="none" stroke={colors.turquoise} strokeWidth={8} />
          <Rect x={20} y={20} width={60} height={12} fill={colors.turquoise} />
          <Rect x={40} y={36} width={40} height={12} fill={colors.turquoise} />
          <Rect x={20} y={52} width={40} height={12} fill={colors.turquoise} />
          <Rect x={20} y={68} width={60} height={12} fill={colors.turquoise} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
