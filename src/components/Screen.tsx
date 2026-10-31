import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type Props = {
  children: ReactNode;
  /** En-tête de l'écran, premier élément du contenu (il défile avec). */
  header?: ReactNode;
  /** Écran avec barre d'onglets : marge du bas réduite, la barre gère l'inset. */
  tab?: boolean;
  style?: StyleProp<ViewStyle>;
  background?: string;
  statusBar?: 'light' | 'dark';
};

/**
 * Conteneur d'écran : padding 24/20, écart 24 entre blocs.
 * Le défilement garde `flexGrow: 1` pour que la dernière carte remplisse
 * l'espace restant, et remonte automatiquement le champ en cours de saisie
 * au-dessus du clavier.
 */
export function Screen({ children, header, tab, style, background = colors.background, statusBar = 'dark' }: Props) {
  return (
    <SafeAreaView edges={tab ? ['top'] : ['top', 'bottom']} style={[styles.safe, { backgroundColor: background }]}>
      <StatusBar style={statusBar} />
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tab ? spacing.screenTop : spacing.screenBottom }, style]}
        // Marge entre le champ actif et le haut du clavier
        bottomOffset={spacing.gap}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {header}
        {children}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flexGrow: 1,
    gap: spacing.gap,
    paddingTop: spacing.screenTop,
    paddingHorizontal: spacing.screenX,
  },
});
