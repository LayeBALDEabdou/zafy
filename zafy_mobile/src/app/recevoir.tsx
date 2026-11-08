import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Button, PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { AmountInput, Label } from '@/components/Form';
import { HeroCard } from '@/components/HeroCard';
import { Icon } from '@/components/Icon';
import { QR_SIZE, QrCode } from '@/components/QrCode';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCurrency } from '@/hooks/useCurrency';
import { useWallet } from '@/context/WalletContext';
import { useT } from '@/i18n';
import { createSparkInvoice } from '@/lib/breez';
import { formatValue, parseInput } from '@/lib/currency';
import { paymentLink } from '@/lib/paymentLink';
import { zafyAddress } from '@/lib/phone';
import { colors, fonts } from '@/theme';

/**
 * 04 — Recevoir : un QR avec la facture Zafy (Spark), régénérée quand le montant change.
 * Le payeur Zafy y lit l'identité de celui qui reçoit : il voit son nom s'il l'a dans ses contacts.
 */
export default function Recevoir() {
  const { t } = useT();
  const { profile } = useWallet();
  const { currency, format, unit, decimals, inputToSats, formatInput, inputHint, quickAmounts } = useCurrency();
  /** Montant demandé, saisi dans la devise choisie (vide ou 0 = le payeur choisit). */
  const [amount, setAmount] = useState(quickAmounts[1]);
  const [request, setRequest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'request' | 'address' | null>(null);
  const sats = inputToSats(amount);
  const fullName = profile?.name;
  // Adresse Zafy : affichée seulement si l'utilisateur est trouvable par son numéro
  const address = profile && profile.discoverable !== false ? zafyAddress(profile.name, profile.phone) : null;

  useEffect(() => {
    let cancelled = false;
    // Petite attente pour ne pas créer une facture à chaque chiffre tapé.
    const timer = setTimeout(() => {
      setRequest(null);
      setError(null);
      const description = fullName ? t('receive.invoiceFor', { name: fullName }) : t('receive.invoiceDefault');
      createSparkInvoice(sats, description)
        .then((invoice) => !cancelled && setRequest(invoice))
        .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sats, fullName, t]);

  const copy = async (what: 'request' | 'address') => {
    const value = what === 'request' ? request : address;
    if (!value) return;
    await Clipboard.setStringAsync(value);
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  };

  const share = () => {
    if (!request) return;
    // Le montant tel qu'il a été saisi, dans la devise choisie (« 5 000 FCFA », « 10,00 € »)
    const amountText = sats <= 0 ? '' : currency === 'SAT' ? format(sats) : formatValue(parseInput(amount, currency), currency);
    Share.share({
      message: t('receive.shareMessage', {
        amount: amountText ? `${amountText} ` : '',
        // Lien https cliquable dans WhatsApp / SMS : il ouvre Zafy sur Envoyer avec la facture
        // Lien long : il contient la facture, il marche sans l'annuaire
        link: paymentLink({ invoice: request, name: fullName, amount: amountText || undefined }),
      }),
    });
  };

  return (
    <Screen header={<ScreenHeader title={t('receive.title')} />}>
      <HeroCard variant="large" style={styles.hero}>
        {request ? (
          // Majuscules : QR plus compact (mode alphanumérique) ; le scanner Zafy remet en minuscules
          <QrCode value={request.toUpperCase()} />
        ) : (
          <View style={styles.qrBox}>
            {error ? (
              <Text style={styles.qrError}>{t('receive.unavailable', { error })}</Text>
            ) : (
              <ActivityIndicator color={colors.navy} />
            )}
          </View>
        )}
        {address ? (
          // Entre utilisateurs Zafy, le numéro suffit : pas besoin de scanner
          <Pressable onPress={() => copy('address')} style={styles.invoiceRow} accessibilityLabel={t('receive.copyAddress')}>
            <Text style={styles.invoice}>{copied === 'address' ? t('common.copied') : address}</Text>
            <Icon name={copied === 'address' ? 'check' : 'copy'} size={16} color={colors.turquoise} />
          </Pressable>
        ) : (
          <Text style={styles.invoice}>{request ? t('receive.scanMe') : error ? t('receive.none') : t('receive.creating')}</Text>
        )}
      </HeroCard>

      <Text style={styles.formatHint}>{t('receive.unifiedHint')}</Text>

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
        <Button
          title={copied === 'request' ? t('receive.copied') : t('receive.copyInvoice')}
          variant="secondary"
          style={styles.flex}
          onPress={() => copy('request')}
        />
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
  formatHint: {
    fontFamily: fonts.inter400,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  buttons: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
