import { StyleSheet, Text, View } from 'react-native';

import { Input, Label } from '@/components/Form';
import { useT } from '@/i18n';
import { MAX_NAME_LENGTH } from '@/lib/account';
import { colors, fonts } from '@/theme';

type Props = {
  name: string;
  onNameChange: (name: string) => void;
  /** Uniquement des chiffres (9 au plus). */
  phone: string;
  onPhoneChange: (phone: string) => void;
};

/** Nom complet et numéro, partagés par l'inscription, la restauration et la modification du profil. */
export function ProfileFields({ name, onNameChange, phone, onPhoneChange }: Props) {
  const { t } = useT();
  return (
    <>
      <View style={styles.field}>
        <Label>{t('common.fullName')}</Label>
        <Input
          value={name}
          onChangeText={onNameChange}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          maxLength={MAX_NAME_LENGTH}
          placeholder={t('common.fullNamePlaceholder')}
        />
      </View>
      <View style={styles.field}>
        <Label>{t('common.phone')}</Label>
        <View style={styles.phoneRow}>
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>+221</Text>
          </View>
          <Input
            value={phone}
            // Chiffres seulement : espaces, tirets et autres caractères sont ignorés à la saisie
            onChangeText={(text) => onPhoneChange(text.replace(/\D/g, '').slice(0, 9))}
            keyboardType="number-pad"
            autoComplete="tel-national"
            textContentType="telephoneNumber"
            maxLength={9}
            placeholder="771234567"
            style={styles.flex}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  phoneRow: { flexDirection: 'row', gap: 8 },
  prefix: {
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.navy,
    justifyContent: 'center',
  },
  prefixText: { fontFamily: fonts.inter600, fontSize: 15, color: colors.white },
  flex: { flex: 1, minWidth: 0 },
});
