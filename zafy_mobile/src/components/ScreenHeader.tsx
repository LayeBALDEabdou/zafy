import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { t } from '@/i18n';
import { colors, fonts } from '@/theme';

type Props = {
  title?: string;
  /** Destination explicite (ex. onglet Accueil depuis Vérifier) ; sinon retour à l'écran précédent. */
  backTo?: Href;
};

export function ScreenHeader({ title, backTo }: Props) {
  const goBack = () => {
    // navigate change d'onglet ; dismissTo ne fonctionne que dans une pile d'écrans
    if (backTo) router.navigate(backTo);
    else if (router.canGoBack()) router.back();
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel={t('a11y.back')}
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}>
        <Icon name="back" color={colors.navy} />
      </Pressable>
      {title ? <Text style={styles.title}>{title}</Text> : null}
    </View>
  );
}

/** Titre des écrans d'onglet sans bouton retour (Alertes, Profil). */
export function TabTitle({ children }: { children: string }) {
  return <Text style={styles.tabTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.sora700, fontSize: 20, color: colors.navy },
  tabTitle: {
    height: 44,
    textAlignVertical: 'center',
    lineHeight: 44,
    fontFamily: fonts.sora700,
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.navy,
  },
});
