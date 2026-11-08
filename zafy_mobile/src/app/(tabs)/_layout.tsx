import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { useWallet } from '@/context/WalletContext';
import { colors } from '@/theme';

export default function TabsLayout() {
  const { status } = useWallet();

  // Portefeuille fermé (rechargement de l'app, déconnexion) : retour au déverrouillage.
  if (status === 'locked') return <Redirect href="/connexion" />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        // Léger glissement + fondu entre onglets (aucune animation par défaut)
        animation: 'shift',
      }}>
      <Tabs.Screen name="accueil" />
      <Tabs.Screen name="verifier" />
      <Tabs.Screen name="alertes" />
      <Tabs.Screen name="profil" />
      {/* Page sans onglet propre : la barre reste visible, « Accueil » est mis en avant */}
      <Tabs.Screen name="transactions" />
    </Tabs>
  );
}
