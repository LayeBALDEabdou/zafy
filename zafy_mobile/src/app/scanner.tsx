import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useT } from '@/i18n';
import { emitScan } from '@/lib/scan';
import { colors, fonts } from '@/theme';

const FRAME = 260;
const CORNER = 36;

/** Scanner de QR code (facture Lightning, adresse Spark ou Bitcoin, carte de contact Zafy). */
export default function Scanner() {
  const { t } = useT();
  const [permission, requestPermission] = useCameraPermissions();
  // La caméra détecte le même code plusieurs fois par seconde : on ne garde que le premier.
  const handled = useRef(false);

  const onScanned = ({ data }: BarcodeScanningResult) => {
    if (handled.current || !data) return;
    handled.current = true;
    // Fermer d'abord : l'écran qui reçoit le scan peut lui-même ouvrir un autre écran (ex. ajout d'un contact)
    router.back();
    emitScan(data);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {permission?.granted ? (
        <>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onScanned}
          />
          {/* Cadre de visée */}
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.frame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.hint}>{t('scanner.aim')}</Text>
          </View>
        </>
      ) : (
        <View style={styles.permission}>
          {!permission ? (
            <ActivityIndicator color={colors.turquoise} />
          ) : (
            <>
              <View style={styles.permissionIcon}>
                <Icon name="scan" size={32} color={colors.navy} />
              </View>
              <Text style={styles.permissionTitle}>{t('scanner.cameraAccess')}</Text>
              <Text style={styles.permissionText}>
                {t('scanner.cameraWhy')}
              </Text>
              <PrimaryButton
                title={permission.canAskAgain ? t('scanner.allow') : t('scanner.openSettings')}
                style={styles.permissionButton}
                onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
              />
            </>
          )}
        </View>
      )}

      <SafeAreaView edges={['top']} style={styles.header} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} accessibilityLabel={t('common.close')} style={styles.close}>
          <Icon name="close" size={20} color={colors.navy} />
        </Pressable>
        <Text style={styles.title}>{t('scanner.title')}</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  title: { fontFamily: fonts.sora700, fontSize: 20, color: colors.white, marginTop: 12 },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 28 },
  frame: { width: FRAME, height: FRAME },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.turquoise },
  topLeft: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 24 },
  topRight: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 24 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 24 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 24 },
  hint: {
    fontFamily: fonts.inter600,
    fontSize: 15,
    lineHeight: 22,
    color: colors.white,
    textAlign: 'center',
    backgroundColor: 'rgba(19, 33, 58, 0.7)',
    borderRadius: 14,
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
  permissionIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.turquoise,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: { fontFamily: fonts.sora700, fontSize: 22, color: colors.white },
  permissionText: { fontFamily: fonts.inter400, fontSize: 15, lineHeight: 22, color: colors.textOnNavy, textAlign: 'center' },
  permissionButton: { alignSelf: 'stretch', marginTop: 8 },
});
