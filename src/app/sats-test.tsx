import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button, PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { HeroCard } from '@/components/HeroCard';
import { Icon } from '@/components/Icon';
import { QrCode } from '@/components/QrCode';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useWallet } from '@/context/WalletContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useT } from '@/i18n';
import { getSparkAddress, TEST_FAUCET_URL } from '@/lib/breez';
import { colors, fonts } from '@/theme';

const STEPS = ['add.step1', 'add.step2', 'add.step3'] as const;

/** Sats gratuits sur le réseau de test (aucune valeur réelle). */
export default function SatsTest() {
  const { t } = useT();
  const { balanceSats } = useWallet();
  const { format } = useCurrency();
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getSparkAddress()
      .then(setAddress)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const copy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Screen header={<ScreenHeader title={t('add.testSats')} />}>
      <HeroCard variant="large" style={styles.hero}>
        <View style={styles.qrBox}>
          {address ? (
            <QrCode value={address} size={172} />
          ) : error ? (
            <Text style={styles.qrError}>{error}</Text>
          ) : (
            <ActivityIndicator color={colors.navy} />
          )}
        </View>
        <Text style={styles.balance}>
          {t('add.balance', { amount: balanceSats === null ? '…' : format(balanceSats) })}
        </Text>
        <Text style={styles.heroSub}>{t('add.testNetwork')}</Text>
      </HeroCard>

      <Card style={styles.steps}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.step}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{t(s)}</Text>
          </View>
        ))}
      </Card>

      <View style={styles.buttons}>
        <Button
          title={copied ? t('common.copied') : t('add.copyAddress')}
          variant="secondary"
          icon={<Icon name={copied ? 'check' : 'copy'} size={18} color={colors.navy} />}
          style={styles.flex}
          onPress={copy}
        />
        <PrimaryButton title={t('add.faucet')} style={styles.flex} onPress={() => WebBrowser.openBrowserAsync(TEST_FAUCET_URL)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingVertical: 24, gap: 10 },
  qrBox: {
    width: 196,
    height: 196,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  qrError: { fontFamily: fonts.inter500, fontSize: 13, color: colors.dangerText, textAlign: 'center', padding: 12 },
  balance: { fontFamily: fonts.sora700, fontSize: 20, color: colors.white },
  heroSub: { fontFamily: fonts.inter400, fontSize: 14, color: colors.textOnNavy },
  steps: { gap: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontFamily: fonts.sora700, fontSize: 13, color: colors.successText },
  stepText: { flex: 1, fontFamily: fonts.inter500, fontSize: 15, color: colors.navy },
  buttons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
