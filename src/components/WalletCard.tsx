import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { colors, fonts } from '@/theme';

const BUTTON_HEIGHT = 44;
const RING = 6;

type Props = {
  children: ReactNode;
  /** Bouton posé à cheval sur le bord bas, dans une encoche de la couleur du fond. */
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Carte unie façon carte bancaire, avec une seconde carte qui dépasse derrière. */
export function WalletCard({ children, action, style }: Props) {
  return (
    <View style={[styles.stack, action ? styles.stackWithAction : null, style]}>
      <View style={styles.back} />
      <View style={styles.card}>{children}</View>
      {action ? <View style={styles.notch}>{action}</View> : null}
    </View>
  );
}

/** Petit libellé gris au-dessus d'une valeur (« Solde », « Téléphone »…). */
export const CardLabel = ({ children }: { children: ReactNode }) => <Text style={styles.label}>{children}</Text>;

/** Bouton pilule turquoise avec pastille d'icône, comme « Add Card ». */
export function CardButton({ icon, title, onPress }: { icon: IconName; title: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}>
      <View style={styles.buttonIcon}>
        <Icon name={icon} size={16} color={colors.turquoise} strokeWidth={2.6} />
      </View>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export const cardText = StyleSheet.create({
  big: { fontFamily: fonts.sora700, fontSize: 34, letterSpacing: -1, color: colors.white },
  value: { fontFamily: fonts.inter600, fontSize: 15, color: colors.white },
});

const styles = StyleSheet.create({
  stack: { paddingTop: 12, flexShrink: 0 },
  // Place pour la moitié du bouton qui dépasse sous la carte
  stackWithAction: { paddingBottom: BUTTON_HEIGHT / 2 },
  notch: {
    position: 'absolute',
    right: 16,
    bottom: -RING,
    padding: RING,
    borderRadius: BUTTON_HEIGHT / 2 + RING,
    backgroundColor: colors.background,
  },
  back: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.turquoise,
  },
  card: { backgroundColor: colors.navy, borderRadius: 24, padding: 22, gap: 18 },
  label: { fontFamily: fonts.inter400, fontSize: 13, color: colors.textOnNavy, marginBottom: 4 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: BUTTON_HEIGHT,
    paddingLeft: 6,
    paddingRight: 18,
    borderRadius: BUTTON_HEIGHT / 2,
    backgroundColor: colors.turquoise,
  },
  buttonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontFamily: fonts.inter600, fontSize: 14, color: colors.navy },
});
