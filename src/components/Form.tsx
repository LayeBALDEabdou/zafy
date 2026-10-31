import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { t } from '@/i18n';
import { colors, fonts, radius } from '@/theme';

export function Label({ children, hint }: { children: string; hint?: string }) {
  return (
    <Text style={styles.label}>
      {children}
      {hint ? <Text style={styles.hint}> · {hint}</Text> : null}
    </Text>
  );
}

export function Input({ style, ...props }: TextInputProps & { style?: StyleProp<TextStyle> }) {
  return <TextInput placeholderTextColor={colors.textSecondary} style={[styles.input, style]} {...props} />;
}

export function TextArea({ style, ...props }: TextInputProps & { style?: StyleProp<TextStyle> }) {
  return (
    <TextInput
      multiline
      textAlignVertical="top"
      placeholderTextColor={colors.textSecondary}
      style={[styles.textarea, style]}
      {...props}
    />
  );
}

/** Champ « À qui ? » : pastille initiale + saisie + action optionnelle. */
export function RecipientInput({
  value,
  onChangeText,
  right,
}: {
  value: string;
  onChangeText: (v: string) => void;
  right?: ReactNode;
}) {
  const initial = value.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.recipient, right ? { paddingRight: 8 } : null]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={t('a11y.recipientPlaceholder')}
        placeholderTextColor={colors.textSecondary}
        style={styles.recipientInput}
      />
      {right}
    </View>
  );
}

/** Saisie de montant en sats, alignée à droite avec soulignement turquoise. */
export function AmountInput({
  value,
  onChangeText,
  size = 'md',
  hint,
  unit = 'sats',
  decimals = false,
  editable = true,
}: {
  value: string;
  onChangeText: (v: string) => void;
  size?: 'md' | 'lg';
  /** Équivalent affiché dessous (« 4 526 sats »). */
  hint?: string | null;
  /** Unité de la saisie : la devise choisie (« FCFA », « € »…). */
  unit?: string;
  /** Clavier avec virgule (euro, dollar). */
  decimals?: boolean;
  /** `false` quand le montant est imposé (ex. par une facture). */
  editable?: boolean;
}) {
  const lg = size === 'lg';
  return (
    <>
      <View style={styles.amountRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
          editable={editable}
          style={[styles.amountInput, { fontSize: lg ? 56 : 32, height: lg ? 68 : 42 }]}
        />
        <Text style={[styles.amountUnit, { fontSize: lg ? 20 : 16, marginBottom: lg ? 10 : 6 }]}>{unit}</Text>
      </View>
      {hint ? <Text style={styles.fcfa}>≈ {hint}</Text> : null}
    </>
  );
}

/** Groupe de boutons à choix unique (chips en grille ou segmenté). */
export function ChoiceGroup<T extends string>({
  options,
  value,
  onChange,
  columns,
  segmented,
  style,
  getLabel,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  columns: number;
  segmented?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Texte affiché pour une option (traduction) ; l'option elle-même sinon. */
  getLabel?: (option: T) => string;
}) {
  return (
    <View style={[styles.choices, segmented && styles.segmented, style]}>
      {options.map((o) => {
        const active = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.choice,
              { flexBasis: `${100 / columns - 4}%` },
              segmented
                ? { height: 44, borderRadius: 11, backgroundColor: active ? colors.navy : 'transparent' }
                : { backgroundColor: active ? colors.navy : colors.background },
            ]}>
            <Text
              style={[
                styles.choiceText,
                { color: active ? colors.white : segmented ? colors.textSecondary : colors.navy },
              ]}>
              {getLabel ? getLabel(o) : o}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.inter600, fontSize: 14, color: colors.navy },
  hint: { fontFamily: fonts.inter400, color: colors.textSecondary },
  input: {
    height: 52,
    borderRadius: radius.input,
    backgroundColor: colors.input,
    paddingHorizontal: 14,
    color: colors.navy,
    fontFamily: fonts.inter500,
    fontSize: 15,
  },
  textarea: {
    flexGrow: 1,
    minHeight: 96,
    borderRadius: radius.input,
    backgroundColor: colors.input,
    padding: 14,
    color: colors.navy,
    fontFamily: fonts.inter400,
    fontSize: 15,
    lineHeight: 22,
  },
  recipient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    borderRadius: radius.input,
    backgroundColor: colors.input,
    paddingLeft: 14,
    paddingRight: 14,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.turquoise,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.sora700, fontSize: 14, color: colors.navy },
  recipientInput: { flex: 1, minWidth: 0, color: colors.navy, fontFamily: fonts.inter500, fontSize: 15, padding: 0 },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.turquoise,
    paddingBottom: 6,
  },
  amountInput: { flex: 1, minWidth: 0, textAlign: 'right', color: colors.navy, fontFamily: fonts.sora700, padding: 0 },
  amountUnit: { fontFamily: fonts.sora600, color: colors.textSecondary },
  fcfa: { fontFamily: fonts.inter400, fontSize: 13, color: colors.textSecondary, textAlign: 'right' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segmented: { gap: 0, backgroundColor: colors.background, borderRadius: radius.input, padding: 4 },
  choice: { flexGrow: 1, height: 48, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontFamily: fonts.inter600, fontSize: 14 },
});
