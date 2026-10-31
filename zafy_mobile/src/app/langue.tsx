import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { LanguageFlag } from '@/components/LanguageFlag';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LANGUAGES, useT } from '@/i18n';
import { colors, fonts } from '@/theme';

/** Choix de la langue de l'app (français ou anglais). */
export default function Langue() {
  const { t, language, setLanguage } = useT();

  return (
    <Screen header={<ScreenHeader title={t('profile.language')} />}>
      <Card style={styles.list}>
        {LANGUAGES.map((l, i) => {
          const active = l.code === language;
          return (
            <Pressable
              key={l.code}
              // Autre langue : la navigation est reconstruite et ramène au Profil (voir le layout racine)
              onPress={() => (active ? router.back() : setLanguage(l.code))}
              style={({ pressed }) => [styles.row, i < LANGUAGES.length - 1 && styles.divider, pressed && { opacity: 0.7 }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}>
              <LanguageFlag language={l.code} size={44} active={active} />
              <Text style={styles.label}>{l.label}</Text>
              {active ? <Icon name="check" size={20} color={colors.successText} strokeWidth={2.6} /> : null}
            </Pressable>
          );
        })}
      </Card>
      <Text style={styles.note}>{t('profile.languageNote')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 6, paddingHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.background },
  label: { flex: 1, fontFamily: fonts.inter600, fontSize: 15, color: colors.navy },
  note: { fontFamily: fonts.inter400, fontSize: 13, lineHeight: 18, color: colors.textSecondary, textAlign: 'center' },
});
