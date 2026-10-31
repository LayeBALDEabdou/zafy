import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useT } from '@/i18n';
import { setConfirmHost, type ConfirmRequest } from '@/lib/confirm';
import { colors, fonts } from '@/theme';

/** Carte de confirmation (remplace l'alerte système). À monter une seule fois, à la racine. */
export function ConfirmDialog() {
  const { t } = useT();
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    setConfirmHost((next) => {
      // Une nouvelle demande annule celle qui serait restée ouverte
      setRequest((current) => {
        current?.resolve(false);
        return next;
      });
    });
    return () => setConfirmHost(null);
  }, []);

  useEffect(() => {
    if (request) scale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.back(1.6)) });
    else scale.value = 0.92;
  }, [request, scale]);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const answer = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };

  const danger = request?.destructive;
  const icon = request?.icon ?? (danger ? 'alert' : 'check');

  return (
    <Modal visible={!!request} transparent animationType="fade" statusBarTranslucent onRequestClose={() => answer(false)}>
      <Pressable style={styles.overlay} onPress={() => answer(false)} accessibilityLabel={t('common.cancel')}>
        {request ? (
          // Appui sur la carte : ne ferme pas
          <Pressable onPress={() => {}} style={styles.cardWrap}>
            <Animated.View style={[styles.card, cardStyle]}>
              <View style={[styles.iconCircle, danger ? styles.iconDanger : styles.iconDefault]}>
                <Icon name={icon} size={26} color={danger ? colors.dangerText : colors.navy} strokeWidth={2.2} />
              </View>
              <Text style={styles.title}>{request.title}</Text>
              {request.message ? <Text style={styles.message}>{request.message}</Text> : null}
              <View style={styles.actions}>
                <Button title={t('common.cancel')} variant="muted" height={52} style={styles.flex} onPress={() => answer(false)} />
                <Button
                  title={request.confirmText}
                  variant={danger ? 'dark' : 'primary'}
                  height={52}
                  style={[styles.flex, danger && styles.confirmDanger]}
                  onPress={() => answer(true)}
                />
              </View>
            </Animated.View>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(19, 33, 58, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cardWrap: { width: '100%', maxWidth: 380 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 28,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  iconDefault: { backgroundColor: colors.turquoise },
  iconDanger: { backgroundColor: colors.dangerBg },
  title: { fontFamily: fonts.sora700, fontSize: 19, letterSpacing: -0.3, color: colors.navy, textAlign: 'center' },
  message: { fontFamily: fonts.inter400, fontSize: 15, lineHeight: 21, color: colors.textSecondary, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 12 },
  flex: { flex: 1 },
  confirmDanger: { backgroundColor: colors.dangerText },
});
