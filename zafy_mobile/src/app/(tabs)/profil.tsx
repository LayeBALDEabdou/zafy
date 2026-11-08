import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CurrencyIcon } from '@/components/CurrencyIcon';
import { LanguageFlag } from '@/components/LanguageFlag';
import { Icon, type IconName } from '@/components/Icon';
import { LogoMark } from '@/components/Logo';
import { QrCode } from '@/components/QrCode';
import { ReportedBanner } from '@/components/ReportedBanner';
import { Screen } from '@/components/Screen';
import { TabTitle } from '@/components/ScreenHeader';
import { Toggle } from '@/components/Toggle';
import { CardButton, WalletCard } from '@/components/WalletCard';
import { useWallet } from '@/context/WalletContext';
import { useCurrency } from '@/hooks/useCurrency';
import { LANGUAGES, useT } from '@/i18n';
import { getSparkAddress } from '@/lib/breez';
import { confirmAction } from '@/lib/confirm';
import { contactCardLink } from '@/lib/contactCard';
import { zafyAddress } from '@/lib/phone';
import { colors, fonts } from '@/theme';

/** « 771234567 » → « +221 77 123 45 67 » */
const formatPhone = (digits: string) => `+221 ${digits.replace(/^(\d{2})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3 $4')}`;

const shorten = (s: string) => (s.length > 22 ? `${s.slice(0, 10)}…${s.slice(-6)}` : s);

/** 12 — Profil */
export default function Profil() {
  const { t, language } = useT();
  const { profile, lock, directory, syncDirectory } = useWallet();
  const discoverable = profile?.discoverable !== false;
  const [scamAlerts, setScamAlerts] = useState(true);
  const [address, setAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { currency } = useCurrency();

  useEffect(() => {
    getSparkAddress()
      .then(setAddress)
      .catch(() => {});
  }, []);

  // Les clés restent sur le téléphone : se déconnecter ferme seulement le portefeuille.
  const logout = async () => {
    const ok = await confirmAction(
      t('profile.logoutTitle'),
      t('profile.logoutMessage'),
      t('profile.logout'),
      true,
      'lock',
    );
    if (!ok) return;
    router.dismissTo('/');
    await lock();
  };

  // Adresse affichée en haut : l'adresse Zafy (a.balde.776511631@zafy), sinon l'adresse Spark
  const shownAddress = profile && discoverable ? zafyAddress(profile.name, profile.phone) : address;

  const copyAddress = async () => {
    if (!shownAddress) return;
    await Clipboard.setStringAsync(shownAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fullName = profile?.name ?? '';
  // Carte de contact : prénom, numéro et adresse, pour être ajouté à l'annuaire de l'autre sans rien écrire
  // Lien long : prénom, numéro et adresse dans le lien, il marche sans l'annuaire
  const cardLink = address && profile ? contactCardLink({ name: fullName, phone: profile.phone, address }) : null;
  const shareCard = () => cardLink && Share.share({ message: t('profile.shareCardMessage', { link: cardLink }) });

  return (
    <Screen tab header={<TabTitle>{t('profile.title')}</TabTitle>}>
      <WalletCard
        action={
          <CardButton icon={copied ? 'check' : 'copy'} title={copied ? t('common.copied') : t('common.copy')} onPress={copyAddress} />
        }>
        <LogoMark size={26} />

        <View style={styles.identity}>
          {/* Prénom long : la taille du texte diminue pour tenir sur une ligne */}
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {fullName}
          </Text>
          {/* Marge à droite : le bouton « Copier » est posé sur le bord bas de la carte */}
          <Text style={styles.address} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {shownAddress === address ? (address ? shorten(address) : '…') : shownAddress}
          </Text>
        </View>
      </WalletCard>

      <ReportedBanner />

      {/* Carte de contact Zafy : scannée, elle ajoute à l'annuaire ou remplit l'adresse d'un envoi */}
      {cardLink ? (
        <Card style={styles.qrCard}>
          <Text style={styles.qrTitle}>{t('profile.myCard')}</Text>
          {/* Bordure : le cadre blanc du QR se détache de la carte blanche */}
          <QrCode value={cardLink} style={styles.qr} />
          <Text style={styles.qrHint}>
            {t('profile.myCardHint')}
          </Text>
          <Button
            title={t('profile.shareCard')}
            variant="muted"
            height={48}
            icon={<Icon name="send" size={16} color={colors.navy} />}
            style={styles.qrShare}
            onPress={shareCard}
          />
        </Card>
      ) : null}

      <Pressable onPress={() => router.push('/cles')} style={styles.backup}>
        <View style={styles.backupIcon}>
          <Icon name="alert" size={20} color={colors.navy} strokeWidth={2.2} />
        </View>
        <Text style={styles.backupText}>{t('profile.backupKeys')}</Text>
        <Icon name="chevronRight" size={20} color={colors.navy} />
      </Pressable>

      <Card fill style={styles.list}>
        <Row
          icon="pencil"
          label={t('profile.editProfile')}
          onPress={() => router.push('/modifier-profil')}
          right={<Icon name="chevronRight" size={18} color={colors.textSecondary} />}
        />
        <Row
          icon="user"
          label={t('profile.contacts')}
          onPress={() => router.push('/contacts')}
          right={<Icon name="chevronRight" size={18} color={colors.textSecondary} />}
        />
        <Row
          icon="phone"
          label={t('common.phoneShort')}
          onPress={() => router.push('/modifier-profil')}
          right={<Value>{profile ? formatPhone(profile.phone) : ''}</Value>}
        />
        {/* Adresse Zafy : publiée dans l'annuaire, on peut être payé avec son numéro */}
        <Row
          icon="send"
          label={t('profile.zafyAddress')}
          onPress={directory === 'error' ? syncDirectory : () => router.push('/modifier-profil')}
          right={
            <Value>
              {!profile || !discoverable
                ? t('profile.zafyAddressHidden')
                : directory === 'error'
                  ? t('profile.zafyAddressRetry')
                  : directory === 'syncing'
                    ? t('profile.zafyAddressSyncing')
                    : t('profile.zafyAddressOn')}
            </Value>
          }
        />
        <Row
          icon="bolt"
          label={t('profile.currency')}
          onPress={() => router.push('/devise')}
          right={
            <View style={styles.currency}>
              <Value>{t(`currency.${currency}`)}</Value>
              <CurrencyIcon currency={currency} size={28} />
            </View>
          }
        />
        <Row
          icon="globe"
          label={t('profile.language')}
          onPress={() => router.push('/langue')}
          right={
            <View style={styles.currency}>
              <Value>{LANGUAGES.find((l) => l.code === language)?.label ?? ''}</Value>
              <LanguageFlag language={language} size={28} />
            </View>
          }
        />
        <Row icon="lock" label={t('profile.securityCode')} right={<Icon name="chevronRight" size={18} color={colors.textSecondary} />} />
        <Row
          icon="bell"
          label={t('profile.scamAlerts')}
          right={<Toggle value={scamAlerts} onChange={setScamAlerts} label={t('profile.scamAlerts')} />}
        />
      </Card>

      <Button title={t('profile.logout')} variant="danger" height={52} onPress={logout} />
    </Screen>
  );
}

function Row({ icon, label, right, onPress }: { icon: IconName; label: string; right: ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={20} color={colors.navy} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {right}
    </Pressable>
  );
}

const Value = ({ children }: { children: string }) => <Text style={styles.value}>{children}</Text>;

const styles = StyleSheet.create({
  identity: { gap: 4 },
  name: { fontFamily: fonts.sora700, fontSize: 26, letterSpacing: -0.5, color: colors.white },
  address: { fontFamily: fonts.inter400, fontSize: 14, color: colors.textOnNavy, paddingRight: 120 },
  qrCard: { alignItems: 'center', gap: 12 },
  qrTitle: { fontFamily: fonts.sora600, fontSize: 16, color: colors.navy },
  qrShare: { alignSelf: 'stretch' },
  qr: { borderWidth: 1.5, borderColor: colors.background },
  qrHint: { fontFamily: fonts.inter400, fontSize: 13, lineHeight: 18, color: colors.textSecondary, textAlign: 'center' },
  backup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.warningBg,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  backupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupText: { flex: 1, fontFamily: fonts.inter600, fontSize: 15, color: colors.navy },
  list: { paddingVertical: 8, paddingHorizontal: 18, justifyContent: 'space-around' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontFamily: fonts.inter500, fontSize: 15, color: colors.navy },
  currency: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { fontFamily: fonts.inter400, fontSize: 14, color: colors.textSecondary },
});
