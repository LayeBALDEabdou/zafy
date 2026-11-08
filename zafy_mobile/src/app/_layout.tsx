import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useWallet, WalletProvider } from '@/context/WalletContext';
import { onAutoPayments, runAutoPayments } from '@/lib/autopay';
import { loadCurrency } from '@/lib/currency';
import { configureNotifications, NOTIFICATIONS_ENABLED } from '@/lib/notifications';
import { getPlan } from '@/lib/plans';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();
if (NOTIFICATIONS_ENABLED) configureNotifications();
// Devise choisie et derniers taux connus
loadCurrency();

/**
 * Touche sur un rappel de paiement planifié → écran de confirmation.
 * Un paiement automatique n'a rien à confirmer : l'app s'ouvre normalement et l'envoi part après le déverrouillage.
 */
function PlanReminderHandler() {
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    const planId = response?.notification.request.content.data?.planId;
    if (typeof planId !== 'string') return;
    Notifications.clearLastNotificationResponse();
    getPlan(planId).then((plan) => {
      if (plan && !plan.autoSend) router.push({ pathname: '/paiement-planifie', params: { id: planId } });
    });
  }, [response]);

  return null;
}

/** Paiements planifiés « sans confirmation » : envoyés dès l'échéance tant que le wallet est ouvert. */
function AutoPayRunner() {
  const { status, refresh } = useWallet();

  // Solde à jour après chaque envoi automatique
  useEffect(() => onAutoPayments(() => refresh().catch(() => {})), [refresh]);

  useEffect(() => {
    if (status !== 'ready') return;
    const run = (retry = false) => runAutoPayments(retry).catch(() => {});

    run(true);
    const timer = setInterval(run, 60_000);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && run(true));
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [status, refresh]);

  return null;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hide();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <KeyboardProvider>
    <WalletProvider>
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        // Glissement façon iOS aussi sur Android (au lieu du fondu par le bas par défaut)
        animation: 'ios_from_right',
        // iOS : retour en glissant depuis n'importe où sur l'écran
        fullScreenGestureEnabled: true,
        animationDuration: 300,
      }}>
      {/* Entrée / sortie du compte : fondu, pas un « retour en arrière » */}
      <Stack.Screen name="index" options={{ animation: 'fade', contentStyle: { backgroundColor: colors.navy } }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen
        name="scanner"
        options={{ animation: 'slide_from_bottom', contentStyle: { backgroundColor: colors.navy } }}
      />
      <Stack.Screen name="envoi-ok" options={{ animation: 'fade_from_bottom', gestureEnabled: false }} />
    </Stack>
    <ConfirmDialog />
    {NOTIFICATIONS_ENABLED ? <PlanReminderHandler /> : null}
    {NOTIFICATIONS_ENABLED ? <AutoPayRunner /> : null}
    </WalletProvider>
    </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
