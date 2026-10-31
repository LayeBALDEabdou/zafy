import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { useT } from '@/i18n';
import { colors, fonts } from '@/theme';

const TABS: Record<string, { label: 'tabs.home' | 'tabs.verify' | 'tabs.alerts' | 'tabs.profile'; icon: IconName }> = {
  accueil: { label: 'tabs.home', icon: 'home' },
  verifier: { label: 'tabs.verify', icon: 'shield' },
  alertes: { label: 'tabs.alerts', icon: 'bell' },
  profil: { label: 'tabs.profile', icon: 'user' },
};

/** Pages de la barre sans onglet propre → onglet mis en avant. */
const PARENT_TAB: Record<string, string> = {
  transactions: 'accueil',
};

/** Barre du bas : fond blanc arrondi, icône active remplie en turquoise. */
export function TabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { t } = useT();
  const current = state.routes[state.index].name;
  const highlighted = PARENT_TAB[current] ?? current;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = route.name === highlighted;

        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          // Depuis Transactions, « Accueil » est en avant mais doit quand même y ramener.
          if (state.index !== index && !event.defaultPrevented) navigateToTab(route.key);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            style={styles.item}>
            <Icon
              name={tab.icon}
              size={22}
              color={focused ? colors.navy : colors.textSecondary}
              fill={focused ? colors.turquoise : 'none'}
            />
            <Text style={[styles.label, focused ? styles.labelActive : null]}>{t(tab.label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingTop: 12,
    paddingHorizontal: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  item: { flex: 1, alignItems: 'center', gap: 4, minHeight: 44 },
  label: { fontFamily: fonts.inter500, fontSize: 12, color: colors.textSecondary },
  labelActive: { fontFamily: fonts.inter700, color: colors.navy },
});
