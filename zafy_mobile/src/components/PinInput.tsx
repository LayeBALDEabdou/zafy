import { useRef, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { useT } from '@/i18n';
import { colors } from '@/theme';

type Props = {
  value: string;
  onChange: (pin: string) => void;
  /** Pour donner le focus depuis l'écran (ex. si le code manque à la validation). */
  ref?: Ref<TextInputInstance>;
  length?: number;
};

/** Code secret en 4 cases ; un champ invisible reçoit la saisie du clavier numérique. */
export function PinInput({ value, onChange, ref, length = 4 }: Props) {
  const { t } = useT();
  const localRef = useRef<TextInputInstance>(null);

  const setRefs = (node: TextInputInstance | null) => {
    localRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <>
      <Pressable onPress={() => localRef.current?.focus()} style={styles.row} accessibilityLabel={t('a11y.pinInput')}>
        {Array.from({ length }, (_, i) => {
          const filled = i < value.length;
          const current = i === value.length;
          return (
            <View key={i} style={[styles.box, filled && styles.filled, current && styles.current]}>
              {filled ? <View style={styles.dot} /> : null}
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={setRefs}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        secureTextEntry
        style={styles.hidden}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  box: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { backgroundColor: colors.navy },
  current: { borderWidth: 2, borderColor: colors.turquoise },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.turquoise },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
