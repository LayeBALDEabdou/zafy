import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useWallet } from '@/context/WalletContext';
import { plural, useT } from '@/i18n';
import { describeDestination } from '@/lib/breez';
import { contactCardLink } from '@/lib/contactCard';
import { findContactByAddress, saveContact, type Contact } from '@/lib/contacts';
import { formatTarget, normalizePhone, reportsAgainst, resolveTarget, type ReportSummary } from '@/lib/nostr';
import { colors, fonts } from '@/theme';

const shorten = (s: string) => (s.length > 26 ? `${s.slice(0, 12)}…${s.slice(-8)}` : s);

type Check = { valid: boolean; identity?: string; existing: Contact | null; reports: ReportSummary[] };

/** Ajout d'un contact depuis sa carte Zafy (QR scanné ou lien reçu) : rien à écrire. */
export default function AjouterContact() {
  const { t } = useT();
  const { n: name = '', p: phone, a: address = '' } = useLocalSearchParams<{ n?: string; p?: string; a?: string }>();
  const { status } = useWallet();
  const [check, setCheck] = useState<Check | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneTarget = phone ? `phone:${normalizePhone(phone)}` : null;

  // Vérifie l'adresse, cherche si la personne est déjà enregistrée ou signalée
  useEffect(() => {
    if (status !== 'ready' || !address) return;
    let cancelled = false;
    (async () => {
      const dest = await describeDestination(address).catch(() => null);
      const valid = dest?.kind === 'spark' || dest?.kind === 'bitcoin';
      const existing = await findContactByAddress(address).catch(() => null);
      const accountTarget = valid ? await resolveTarget(address).catch(() => null) : null;
      const targets = [phoneTarget, accountTarget].filter((t): t is string => !!t);
      const reports = await reportsAgainst(targets).catch(() => []);
      if (!cancelled) setCheck({ valid, identity: dest?.identityPublicKey, existing, reports });
    })();
    return () => {
      cancelled = true;
    };
  }, [status, address, phoneTarget]);

  // Lien ouvert alors que l'app est verrouillée : déverrouiller d'abord, puis revenir ici.
  if (status === 'locked') {
    return (
      <Redirect
        href={{ pathname: '/connexion', params: { next: contactCardLink({ name, phone, address }).replace('zafy://', '/') } }}
      />
    );
  }

  const add = async () => {
    setError(null);
    setSaving(true);
    try {
      await saveContact({ name, phone, address, identity: check?.identity }, check?.existing?.id);
      router.replace('/contacts');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const reported = check?.reports.reduce((max, r) => Math.max(max, r.count), 0) ?? 0;

  return (
    <Screen header={<ScreenHeader title={t('contacts.newTitle')} />}>
      <Card style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
          {name || t('contacts.invalidCard')}
        </Text>
        {phoneTarget ? <Text style={styles.phone}>{formatTarget(phoneTarget)}</Text> : null}
        <View style={styles.address}>
          <Icon name="bolt" size={14} color={colors.successText} />
          <Text style={styles.addressText} numberOfLines={1}>
            {shorten(address)}
          </Text>
        </View>
      </Card>

      {!check ? (
        <ActivityIndicator color={colors.navy} style={styles.loading} />
      ) : !check.valid ? (
        <Text style={styles.error}>{t('contacts.noValidAddress')}</Text>
      ) : (
        <>
          {reported > 0 ? (
            <Pressable
              onPress={() => router.push({ pathname: '/alerte/[id]', params: { id: check.reports[0].target } })}
              style={styles.warning}>
              <Icon name="alert" size={20} color={colors.dangerText} strokeWidth={2.4} />
              <Text style={styles.warningText}>
                {t(plural('contacts.reportedWarning', reported), { n: reported })}
              </Text>
              <Icon name="chevronRight" size={16} color={colors.dangerText} />
            </Pressable>
          ) : (
            <View style={styles.safe}>
              <Icon name="shieldCheck" size={20} color={colors.successText} />
              <Text style={styles.safeText}>{t('contacts.noReports')}</Text>
            </View>
          )}
          {check.existing ? (
            <Text style={styles.info}>{t('contacts.alreadySaved', { name: check.existing.name })}</Text>
          ) : null}
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.buttons}>
        <Button title={t('common.cancel')} variant="secondary" style={styles.flex} onPress={() => router.back()} />
        {check?.valid ? (
          <PrimaryButton
            title={saving ? t('contacts.adding') : check.existing ? t('contacts.update') : t('contacts.add')}
            icon={saving ? <ActivityIndicator color={colors.navy} /> : undefined}
            style={styles.flex}
            onPress={saving ? undefined : add}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 6, paddingVertical: 28 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.turquoise,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: { fontFamily: fonts.sora700, fontSize: 28, color: colors.navy },
  name: { fontFamily: fonts.sora700, fontSize: 24, letterSpacing: -0.5, color: colors.navy },
  phone: { fontFamily: fonts.inter600, fontSize: 16, color: colors.navy },
  address: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  addressText: { fontFamily: fonts.inter500, fontSize: 13, color: colors.textSecondary },
  loading: { marginVertical: 12 },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.dangerBg,
    borderRadius: 16,
    padding: 14,
  },
  warningText: { flex: 1, fontFamily: fonts.inter600, fontSize: 14, color: colors.dangerText },
  safe: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.successBg, borderRadius: 16, padding: 14 },
  safeText: { flex: 1, fontFamily: fonts.inter600, fontSize: 14, color: colors.successText },
  info: { fontFamily: fonts.inter500, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  error: { fontFamily: fonts.inter600, fontSize: 14, color: colors.dangerText, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 'auto' },
  flex: { flex: 1 },
});
