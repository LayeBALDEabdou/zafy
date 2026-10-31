import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Button, PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { AmountInput, ChoiceGroup, Label } from '@/components/Form';
import { HeroCard } from '@/components/HeroCard';
import { Icon } from '@/components/Icon';
import { QR_SIZE, QrCode } from '@/components/QrCode';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatNumber } from '@/data/mock';
import { useCurrency } from '@/hooks/useCurrency';
import { useWallet } from '@/context/WalletContext';
import { useT } from '@/i18n';
import { createInvoice, createSparkInvoice } from '@/lib/breez';
import { colors, fonts } from '@/theme';

/** « lnbcrt50u1p…k3x9 » : début et fin de la facture. */
const shorten = (s: string) => (s.length > 24 ? `${s.slice(0, 12)}…${s.slice(-8)}` : s);

const FORMATS = ['zafy', 'other'] as const;

/**
 * 04 — Recevoir : facture réelle, régénérée quand le montant change.
 * « Zafy » = facture Spark : le payeur Zafy y lit ton identité et voit ton nom s'il t'a dans ses contacts.
 * « Autre portefeuille » = facture Lightning, lisible partout.
 */
export default function Recevoir() {
  const { t } = useT();
  const { profile } = useWallet();
  const { unit, decimals, inputToSats, formatInput, inputHint, quickAmounts } = useCurrency();
  const [format, setFormat] = useState<(typeof FORMATS)[number]>('zafy');
  /** Montant demandé, saisi dans la devise choisie. */
  const [amount, setAmount] = useState(quickAmounts[1]);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const sats = inputToSats(amount);
  const zafy = format === 'zafy';
  const firstName = profile?.firstName;

  useEffect(() => {
    let cancelled = false;
    // Petite attente pour ne pas créer une facture à chaque chiffre tapé.
    const timer = setTimeout(() => {
      setInvoice(null);
      setError(null);
      const description = firstName ? t('receive.invoiceFor', { name: firstName }) : t('receive.invoiceDefault');
      (zafy ? createSparkInvoice(sats, description) : createInvoice(sats, description))
        .then((inv) => !cancelled && setInvoice(inv))
        .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sats, zafy, firstName, t]);

  const copy = async () => {
    if (!invoice) return;
    await Clipboard.setStringAsync(invoice);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = () =>
    invoice &&
    Share.share({
      message: t('receive.shareMessage', {
        amount: sats > 0 ? `${formatNumber(sats)} sats ` : '',
        request: zafy ? invoice : `lightning:${invoice}`,
      }),
    });

  return (
    <Screen header={<ScreenHeader title={t('receive.title')} />}>
      <HeroCard variant="large" style={styles.hero}>
        {invoice ? (
          // Majuscules : QR plus compact (mode alphanumérique), lu par tous les wallets
          <QrCode value={(zafy ? invoice : `lightning:${invoice}`).toUpperCase()} />
        ) : (
          <View style={styles.qrBox}>
            {error ? (
              <Text style={styles.qrError}>{t('receive.unavailable', { error })}</Text>
            ) : (
              <ActivityIndicator color={colors.navy} />
            )}
          </View>
        )}
        <Pressable onPress={copy} disabled={!invoice} style={styles.invoiceRow} accessibilityLabel={t('receive.copyInvoice')}>
          <Text style={styles.invoice}>{copied ? t('receive.copied') : invoice ? shorten(invoice) : error ? t('receive.none') : t('receive.creating')}</Text>
          {invoice ? <Icon name={copied ? 'check' : 'copy'} size={16} color={colors.turquoise} /> : null}
        </Pressable>
      </HeroCard>

      <Card style={styles.amountCard}>
        <ChoiceGroup
          options={FORMATS}
          value={format}
          onChange={setFormat}
          columns={2}
          segmented
          getLabel={(o) => (o === 'zafy' ? t('receive.formatZafy') : t('receive.formatOther'))}
        />
        <Text style={styles.formatHint}>
          {zafy
            ? t('receive.zafyHint')
            : t('receive.otherHint')}
        </Text>
      </Card>

      <Card style={styles.amountCard}>
        <Label hint={t('receive.freeAmount')}>{t('common.amount')}</Label>
        <AmountInput
          value={amount}
          onChangeText={(t) => setAmount(formatInput(t))}
          unit={unit}
          decimals={decimals}
          hint={sats > 0 ? inputHint(sats) : null}
        />
      </Card>

      <View style={styles.buttons}>
        <Button title={t('common.copy')} variant="secondary" style={styles.flex} onPress={copy} />
        <PrimaryButton title={t('common.share')} style={styles.flex} onPress={share} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingVertical: 28, gap: 20, minHeight: 330 },
  qrBox: {
    width: QR_SIZE,
    height: QR_SIZE,
    borderRadius: Math.round(QR_SIZE * 0.09),
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrError: { fontFamily: fonts.inter500, fontSize: 13, color: colors.dangerText, textAlign: 'center', padding: 16 },
  invoiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  invoice: { fontFamily: fonts.sora600, fontSize: 16, color: colors.white },
  amountCard: { gap: 6 },
  formatHint: { fontFamily: fonts.inter400, fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  buttons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
