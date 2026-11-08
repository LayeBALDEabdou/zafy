import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Toggle } from '@/components/Toggle';
import { useWallet } from '@/context/WalletContext';
import { useBiometricUnlock } from '@/hooks/useBiometricUnlock';
import { useT } from '@/i18n';
import { loadBiometricEnabled, saveBiometricEnabled } from '@/lib/account';
import { zafyAddress } from '@/lib/phone';
import { colors, fonts } from '@/theme';

/** Profil → Code et sécurité : code, empreinte, sauvegarde des clés et ce qui est public. */
export default function Securite() {
  const { t } = useT();
  const { profile } = useWallet();
  const { availability } = useBiometricUnlock();
  const [bioEnabled, setBioEnabled] = useState<boolean | null>(null);
  const discoverable = profile?.discoverable !== false;

  useFocusEffect(
    useCallback(() => {
      loadBiometricEnabled().then(setBioEnabled);
    }, []),
  );

  const toggleBio = async (value: boolean) => {
    setBioEnabled(value);
    await saveBiometricEnabled(value);
  };

  // Le téléphone n'a pas de capteur, ou aucune empreinte n'y est enregistrée
  const bioUnsupported = availability === 'no_hardware' || availability === 'not_enrolled';

  return (
    <Screen header={<ScreenHeader title={t('security.title')} />}>
      <Section title={t('security.unlockSection')}>
        <Row
          icon="key"
          label={t('security.changePin')}
          onPress={() => router.push('/changer-code')}
          right={<Icon name="chevronRight" size={18} color={colors.textSecondary} />}
        />
        <Row
          icon="fingerprint"
          label={t('security.biometric')}
          hint={bioUnsupported ? t('security.bioUnsupported') : undefined}
          right={
            bioUnsupported || bioEnabled === null ? null : (
              <Toggle value={bioEnabled} onChange={toggleBio} label={t('security.biometric')} />
            )
          }
          last
        />
        <Note icon="lock">{t('security.lockNote')}</Note>
      </Section>

      <Section title={t('security.keysSection')}>
        <Row
          icon="alert"
          label={t('profile.backupKeys')}
          onPress={() => router.push('/cles')}
          right={<Icon name="chevronRight" size={18} color={colors.textSecondary} />}
          last
        />
        <Note icon="shield">{t('security.keysNote')}</Note>
      </Section>

      {/* Anonymat : ce que les autres peuvent voir, selon l'option « Être payé avec mon numéro » */}
      <Section title={t('security.publicSection')}>
        {discoverable && profile ? (
          <>
            <Bullet>{t('security.publicName', { name: profile.name })}</Bullet>
            <Bullet>{t('security.publicPhone', { address: zafyAddress(profile.name, profile.phone) })}</Bullet>
            <Bullet>{t('security.publicWallet')}</Bullet>
          </>
        ) : (
          <Bullet>{t('security.publicNothing')}</Bullet>
        )}
        <Bullet>{t('security.reportsAnonymous')}</Bullet>
        <Pressable onPress={() => router.push('/modifier-profil')} style={styles.link}>
          <Text style={styles.linkText}>{discoverable ? t('security.hideMe') : t('security.showMe')}</Text>
          <Icon name="chevronRight" size={16} color={colors.navy} />
        </Pressable>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </Card>
  );
}

function Row({
  icon,
  label,
  hint,
  right,
  onPress,
  last,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  right: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && { opacity: 0.7 }]}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={20} color={colors.navy} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

function Note({ icon, children }: { icon: IconName; children: string }) {
  return (
    <View style={styles.note}>
      <Icon name={icon} size={16} color={colors.successText} />
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.dot} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionTitle: { fontFamily: fonts.sora700, fontSize: 16, color: colors.navy },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.background },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: fonts.inter600, fontSize: 15, color: colors.navy },
  rowHint: { fontFamily: fonts.inter400, fontSize: 12, color: colors.textSecondary },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteText: { flex: 1, fontFamily: fonts.inter400, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.turquoise, marginTop: 7 },
  bulletText: { flex: 1, fontFamily: fonts.inter400, fontSize: 14, lineHeight: 20, color: colors.navy },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingTop: 4 },
  linkText: { fontFamily: fonts.inter600, fontSize: 14, color: colors.navy },
});
