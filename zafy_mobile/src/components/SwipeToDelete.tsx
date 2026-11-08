import { useRef, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Icon } from '@/components/Icon';
import { useT } from '@/i18n';
import { confirmAction } from '@/lib/confirm';
import { colors, fonts } from '@/theme';

/** Ligne qu'on glisse vers la gauche pour la supprimer, après confirmation. */
export function SwipeToDelete({
  title,
  message,
  onDelete,
  style,
  children,
}: {
  /** Titre et texte de la confirmation. */
  title: string;
  message: string;
  onDelete: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { t } = useT();
  const swipeable = useRef<SwipeableMethods>(null);

  const confirmDelete = async () => {
    if (await confirmAction(title, message, t('common.delete'), true)) onDelete();
    else swipeable.current?.close();
  };

  return (
    <Swipeable
      ref={swipeable}
      friction={1.5}
      rightThreshold={60}
      overshootRight={false}
      onSwipeableOpen={confirmDelete}
      childrenContainerStyle={styles.front}
      containerStyle={style}
      renderRightActions={() => (
        <View style={styles.action}>
          <Icon name="close" size={18} color={colors.white} strokeWidth={2.4} />
          <Text style={styles.actionText}>{t('common.delete')}</Text>
        </View>
      )}>
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  front: { backgroundColor: colors.card },
  action: {
    width: 110,
    marginVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.dangerDot,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionText: { fontFamily: fonts.inter600, fontSize: 13, color: colors.white },
});
