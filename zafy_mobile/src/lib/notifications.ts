import { t } from '@/i18n';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

/** Canaux Android : l'utilisateur peut régler chacun séparément dans les paramètres du téléphone. */
export const CHANNELS = {
  plans: { id: 'paiements-planifies', name: 'channels.plans' },
  received: { id: 'paiements-recus', name: 'channels.received' },
} as const;

type Channel = keyof typeof CHANNELS;

/** Les notifications n'existent que sur mobile (l'aperçu web planterait). */
export const NOTIFICATIONS_ENABLED = Platform.OS !== 'web';

/** Affiche les notifications même quand l'app est ouverte. */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Demande l'autorisation (une seule fois) et crée les canaux Android. */
export async function ensureNotificationPermission() {
  if (!NOTIFICATIONS_ENABLED) return false;
  if (Platform.OS === 'android') {
    for (const { id, name } of Object.values(CHANNELS)) {
      await Notifications.setNotificationChannelAsync(id, { name: t(name), importance: AndroidImportance.HIGH });
    }
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Notification immédiate. */
export async function notifyNow(channel: Channel, title: string, body: string) {
  if (!NOTIFICATIONS_ENABLED) return;
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: { channelId: CHANNELS[channel].id } });
}
