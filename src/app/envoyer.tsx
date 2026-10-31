import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { AmountInput, ChoiceGroup, Label, RecipientInput } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useWallet } from '@/context/WalletContext';
import { useContacts } from '@/hooks/useContacts';
import { formatNumber } from '@/data/mock';
import { useCurrency } from '@/hooks/useCurrency';
import { plural, useT } from '@/i18n';
import { describeDestination, prepareSend, sendPrepared, type Destination } from '@/lib/breez';
import { confirmAction } from '@/lib/confirm';
import { parseContactCard, type ContactCard } from '@/lib/contactCard';
import { contactPhone, onContactPick } from '@/lib/contacts';
import { reportsFor, resolveTarget } from '@/lib/nostr';
import { cleanDestination, onScan } from '@/lib/scan';
import { colors, fonts } from '@/theme';

const KIND_LABEL = {
  invoice: 'send.kindInvoice',
  sparkInvoice: 'send.kindSparkInvoice',
  spark: 'send.kindSpark',
  bitcoin: 'send.kindBitcoin',
  other: 'send.kindOther',
} as const satisfies Record<Destination['kind'], string>;

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** 02 — Envoyer : facture Lightning, adresse Spark ou adresse Bitcoin. */
export default function Envoyer() {
  const { t } = useT();
  const { balanceSats, refresh } = useWallet();
  const { currency, format, unit, decimals, inputToSats, formatInput, inputFromSats, inputHint, quickAmounts } =
    useCurrency();
  const [to, setTo] = useState('');
  /** Montant saisi dans la devise choisie (converti en sats pour l'envoi). */
  const [amount, setAmount] = useState(quickAmounts[1]);
  /** Destination reconnue, avec le texte analysé (pour ignorer un résultat qui ne correspond plus au champ). */
  const [dest, setDest] = useState<(Destination & { input: string }) | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Carte Zafy scannée (personne pas encore dans l'annuaire). */
  const [card, setCard] = useState<ContactCard | null>(null);
  /** Signalements Nostr du destinataire : `undefined` = vérification en cours, `null` = impossible à vérifier. */
  const [reports, setReports] = useState<{ target: string; count: number } | null | undefined>(null);

  const { find } = useContacts();
  const input = to.trim();
  const current = dest?.input === input ? dest : null;
  const reading = input.length >= 10 && !current;
  const invoiceKind = current?.kind === 'invoice' || current?.kind === 'sparkInvoice';
  // Montant imposé par une facture : bloqué dès qu'elle est collée ou scannée, même pendant sa lecture
  // (facture Lightning « ln… » ou Spark « spark… »). Seule une facture « montant libre » laisse saisir la somme.
  const amountLocked = reading
    ? /^(ln|spark)/i.test(input)
    : invoiceKind
      ? !!current.amountSats
      : current?.kind === 'other' && /^ln/i.test(input);
  const sats = amountLocked ? (current?.amountSats ?? 0) : inputToSats(amount);
  // Contact de l'annuaire : par son adresse, ou par l'identité Spark contenue dans sa facture
  // (vérifiée par le réseau : le texte de la facture, lui, peut être inventé).
  const contact =
    find(input) ?? (current?.identityPublicKey ? find(`sparkid:${current.identityPublicKey}`) : null);
  const quick = quickAmounts.find((q) => q === amount);

  // Cherche sur Nostr si ce destinataire a été signalé
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const target = await resolveTarget(to).catch(() => null);
      if (cancelled) return;
      if (!target) return setReports(null);
      setReports(undefined);
      const summary = await reportsFor(target).catch(() => null);
      if (!cancelled) setReports(summary === null ? { target, count: 0 } : { target, count: summary.count });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [to]);

  // Reconnaît la destination dès qu'elle est saisie ou collée.
  useEffect(() => {
    const input = to.trim();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (input.length < 10) return setDest(null);
      describeDestination(input)
        .then((d) => !cancelled && setDest({ ...d, input }))
        .catch(() => !cancelled && setDest({ kind: 'other', input }));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [to]);

  // Contact choisi dans l'annuaire
  useEffect(() => onContactPick((c) => setTo(c.address)), []);

  // Résultat du scanner (écran /scanner)
  useEffect(
    () =>
      onScan((data) => {
        setCard(parseContactCard(data));
        setTo(cleanDestination(data));
      }),
    [],
  );

  const paste = async () => setTo(cleanDestination(await Clipboard.getStringAsync()));

  const send = async () => {
    setError(null);
    if (reading) return;
    if (!current || current.kind === 'other') {
      return setError(t('send.pasteSomething'));
    }
    if (sats <= 0) return setError(t('send.enterAmount'));
    if (balanceSats !== null && sats > balanceSats) return setError(t('send.insufficient'));

    setSending(true);
    try {
      // La facture fixe déjà son montant : on n'en envoie pas un second.
      const prepared = await prepareSend(to, current.amountSats ? 0 : sats);
      const ok = await confirmAction(
        t('send.confirmTitle', { amount: format(prepared.amountSats) }),
        [
          t('send.fees', { amount: format(prepared.feeSats) }),
          t('send.total', { amount: format(prepared.amountSats + prepared.feeSats) }),
          // Montant exact réellement envoyé, quand on a saisi dans une monnaie
          currency === 'SAT' ? null : t('send.exactSats', { n: formatNumber(prepared.amountSats + prepared.feeSats) }),
        ]
          .filter(Boolean)
          .join('\n'),
        t('common.send'),
        false,
        'send',
      );
      if (!ok) return;
      // Contact reconnu : on note son adresse (et non la facture) pour l'afficher dans l'historique
      await sendPrepared(contact ? { ...prepared, destination: contact.address } : prepared);
      refresh().catch(() => {});
      router.replace({
        pathname: '/envoi-ok',
        params: {
          amount: String(prepared.amountSats),
          to: t(KIND_LABEL[current.kind]),
          fee: String(prepared.feeSats),
          ...(contact ? { name: contact.name } : {}),
        },
      });
    } catch (e) {
      setError(t('send.failed', { error: errorText(e) }));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen header={<ScreenHeader title={t('send.title')} />}>
      <Card style={styles.gap12}>
        <Label>{t('send.to')}</Label>
        <RecipientInput
          value={to}
          onChangeText={setTo}
          right={
            <View style={styles.inputActions}>
              <Pressable
                onPress={() => router.push({ pathname: '/contacts', params: { pick: '1' } })}
                accessibilityLabel={t('a11y.chooseContact')}
                style={styles.paste}>
                <Icon name="user" size={18} color={colors.navy} />
              </Pressable>
              <Pressable onPress={paste} accessibilityLabel={t('common.paste')} style={styles.paste}>
                <Icon name="copy" size={18} color={colors.navy} />
              </Pressable>
              <Pressable
                onPress={() => router.push('/scanner')}
                accessibilityLabel={t('common.scanQr')}
                style={[styles.paste, styles.scan]}>
                <Icon name="scan" size={18} color={colors.turquoise} />
              </Pressable>
            </View>
          }
        />
        <View style={styles.badges}>
          {/* Carte scannée d'une personne inconnue : son nom, et un raccourci pour l'enregistrer */}
          {!contact && card && card.address === to.trim() ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/ajouter-contact',
                  params: { n: card.name, a: card.address, ...(card.phone ? { p: card.phone } : {}) },
                })
              }>
              <Badge
                label={t('send.addToContacts', { name: card.name })}
                tone="warning"
                icon={<Icon name="plus" size={14} color={colors.warningText} strokeWidth={2.8} />}
              />
            </Pressable>
          ) : null}
          {/* Adresse saisie ou scannée reconnue dans l'annuaire : nom et numéro */}
          {contact ? (
            <Badge
              label={[contact.name, contactPhone(contact)].filter(Boolean).join(' · ')}
              icon={<Icon name="user" size={14} color={colors.successText} strokeWidth={2.6} />}
            />
          ) : null}
          {current ? (
            <Badge label={t(KIND_LABEL[current.kind])} tone={current.kind === 'other' ? 'warning' : 'neutral'} />
          ) : null}
          {/* Signalements Nostr du destinataire */}
          {reports === undefined ? (
            <Badge label={t('send.checking')} tone="neutral" />
          ) : reports && reports.count > 0 ? (
            <Pressable onPress={() => router.push({ pathname: '/alerte/[id]', params: { id: reports.target } })}>
              <Badge
                label={t(plural('send.reportedBy', reports.count), { n: reports.count })}
                tone="danger"
                icon={<Icon name="alert" size={14} color={colors.dangerText} strokeWidth={2.8} />}
              />
            </Pressable>
          ) : reports ? (
            <Badge
              label={t('send.noReports')}
              icon={<Icon name="check" size={14} color={colors.successText} strokeWidth={2.8} />}
            />
          ) : null}
        </View>
        {/* Texte écrit par celui qui a créé la facture : affiché, mais jamais utilisé pour reconnaître un contact */}
        {current?.description && !contact ? (
          <Text style={styles.description} numberOfLines={2}>
            {t('send.invoiceMessage', { text: current.description })}
          </Text>
        ) : null}
      </Card>

      <Card fill style={styles.amountCard}>
        <Label hint={amountLocked ? t('send.fixedByInvoice') : invoiceKind ? t('send.invoiceNoAmount') : undefined}>
          {t('common.amount')}
        </Label>
        <AmountInput
          size="lg"
          value={amountLocked ? (current?.amountSats ? inputFromSats(current.amountSats) : '…') : amount}
          onChangeText={(t) => setAmount(formatInput(t))}
          unit={unit}
          decimals={decimals}
          hint={sats > 0 ? inputHint(sats) : null}
          editable={!amountLocked}
        />
        {amountLocked ? (
          <View style={styles.locked}>
            <Icon name="lock" size={16} color={colors.successText} />
            <Text style={styles.lockedText}>
              {reading
                ? t('send.checkingRecipient')
                : invoiceKind
                  ? t('send.lockedAmount')
                  : t('send.invalidInvoice')}
            </Text>
          </View>
        ) : (
          <ChoiceGroup
            options={quickAmounts}
            value={quick ?? ''}
            onChange={setAmount}
            columns={3}
          />
        )}
      </Card>

      <View style={styles.meta}>
        <Text style={styles.metaText}>
          {t('send.balance', { amount: balanceSats === null ? '…' : format(balanceSats) })}
        </Text>
        <Text style={styles.metaText}>{t('send.feesShownBefore')}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        title={sending ? t('send.sending') : reading ? t('send.checking') : t('send.sendAmount', { amount: format(sats) })}
        icon={sending || reading ? <ActivityIndicator color={colors.navy} /> : undefined}
        onPress={sending || reading ? undefined : send}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap12: { gap: 12 },
  paste: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputActions: { flexDirection: 'row', gap: 6 },
  scan: { backgroundColor: colors.navy },
  description: { fontFamily: fonts.inter400, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lockedText: { flex: 1, fontFamily: fonts.inter400, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amountCard: { gap: 18, justifyContent: 'center' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  metaText: { fontFamily: fonts.inter400, fontSize: 14, color: colors.textSecondary },
  error: { fontFamily: fonts.inter600, fontSize: 14, color: colors.dangerText, textAlign: 'center' },
});
