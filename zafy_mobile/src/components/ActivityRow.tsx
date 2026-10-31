import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, type BadgeTone } from '@/components/Badge';
import { colors, fonts } from '@/theme';

type Props = {
  label: string;
  dotColor: string;
  value: string;
  tone: BadgeTone;
  bold?: boolean;
  onPress?: () => void;
};

/** Ligne : point coloré 10 px, libellé, badge montant ou compteur. */
export function ActivityRow({ label, dotColor, value, tone, bold, onPress }: Props) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Badge label={value} tone={tone} bold={bold} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { flex: 1, fontFamily: fonts.inter500, fontSize: 15, color: colors.navy },
});
