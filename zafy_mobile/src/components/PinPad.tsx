import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useT } from '@/i18n';
import { colors, fonts } from '@/theme';

type Props = {
  onDigit: (d: string) => void;
  onDelete: () => void;
  onBiometric?: () => void;
  /** Capteur absent ou aucune empreinte enregistrée : touche grisée (reste cliquable pour expliquer). */
  biometricDisabled?: boolean;
  /** Hauteur des touches : 64 dans la maquette, réduite sur les petits écrans. */
  keyHeight?: number;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'] as const;

export function PinPad({ onDigit, onDelete, onBiometric, biometricDisabled, keyHeight = 64 }: Props) {
  const { t } = useT();
  const gap = keyHeight < 64 ? 10 : 12;
  return (
    <View style={[styles.grid, { gap }]}>
      {KEYS.map((k) => {
        if (k === 'bio') {
          return (
            <Key
              key={k}
              onPress={onBiometric}
              style={{ height: keyHeight, backgroundColor: colors.successBg, opacity: biometricDisabled ? 0.45 : 1 }}
              label={t('a11y.fingerprint')}>
              <Icon name="fingerprint" size={26} color={colors.successText} />
            </Key>
          );
        }
        if (k === 'del') {
          return (
            <Key key={k} onPress={onDelete} style={{ height: keyHeight, backgroundColor: 'transparent' }} label={t('a11y.erase')}>
              <Icon name="backspace" size={26} color={colors.navy} />
            </Key>
          );
        }
        return (
          <Key key={k} onPress={() => onDigit(k)} style={{ height: keyHeight }} label={k}>
            <Text style={styles.digit}>{k}</Text>
          </Key>
        );
      })}
    </View>
  );
}

function Key({
  children,
  onPress,
  style,
  label,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: object;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.key, style, pressed && { opacity: 0.6 }]}>
      {children}
    </Pressable>
  );
}

/** Indicateur de saisie : 4 points (Connexion). */
export function PinDots({ length, filled }: { length: number; filled: number }) {
  const { t } = useT();
  return (
    <View style={styles.dots} accessibilityLabel={t('a11y.pinProgress', { filled, length })}>
      {Array.from({ length }, (_, i) => (
        <View key={i} style={[styles.dot, i < filled ? styles.dotFilled : styles.dotEmpty]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  key: {
    // 3 colonnes avec 2 écarts de 12
    width: '31%',
    flexGrow: 1,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { fontFamily: fonts.sora600, fontSize: 24, color: colors.navy },
  dots: { flexDirection: 'row', gap: 16, paddingTop: 8 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  dotFilled: { backgroundColor: colors.navy },
  dotEmpty: { borderWidth: 2, borderColor: colors.pinEmpty },
});
