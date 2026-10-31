import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, fonts } from '@/theme';

type Props<T extends string> = {
  options: readonly T[];
  /** `null` : aucune pastille active. */
  value: T | null;
  onChange: (v: T) => void;
  /** Élément placé en tête de ligne, toujours visible (ex. bouton calendrier). */
  leading?: ReactNode;
  /** Texte affiché pour une option (traduction) ; l'option elle-même sinon. */
  getLabel?: (option: T) => string;
};

/** Pastille seule, même style que les filtres. */
export function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, styles.chipRow, { backgroundColor: active ? colors.navy : colors.white }]}>
      {icon}
      <Text
        style={[
          styles.text,
          { color: active ? colors.white : colors.navy, fontFamily: active ? fonts.inter600 : fonts.inter500 },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Pastilles de filtre (actif : fond navy). Défilent horizontalement si besoin. */
export function FilterChips<T extends string>({ options, value, onChange, leading, getLabel }: Props<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
      {leading}
      {options.map((o) => (
        <Chip key={o} label={getLabel ? getLabel(o) : o} active={o === value} onPress={() => onChange(o)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Hauteur de son contenu : ne prend pas la place libre de l’écran
  scroll: { flexGrow: 0 },
  row: { gap: 8 },
  chip: { height: 40, paddingHorizontal: 18, borderRadius: 20, justifyContent: 'center' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontSize: 13 },
});
