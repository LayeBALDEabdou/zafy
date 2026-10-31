import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { Language } from '@/i18n';
import { colors } from '@/theme';

const FLAGS: Record<Language, number> = {
  fr: require('@/assets/images/langues/fr.png'),
  en: require('@/assets/images/langues/en.png'),
};

/** Drapeau d'une langue dans une pastille arrondie (bordure turquoise quand elle est choisie). */
export function LanguageFlag({ language, size = 40, active }: { language: Language; size?: number; active?: boolean }) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.35 }, active && styles.active]}>
      <Image source={FLAGS[language]} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', backgroundColor: colors.background },
  active: { borderColor: colors.turquoise },
});
