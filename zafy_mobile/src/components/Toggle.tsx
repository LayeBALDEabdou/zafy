import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

type Props = { value: boolean; onChange: (v: boolean) => void; label: string };

export function Toggle({ value, onChange, label }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      style={[styles.track, { backgroundColor: value ? colors.turquoise : colors.neutralBg }]}>
      <View style={[styles.thumb, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 52, height: 32, borderRadius: 16, padding: 3 },
  thumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.navy },
});
