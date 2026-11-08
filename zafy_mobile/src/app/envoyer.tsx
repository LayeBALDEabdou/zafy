import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
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
import { formatInput as formatAmountInput, getCurrencyState, inputFromSats as satsToInput, toSats } from '@/lib/currency';
import { lookupPhone, type PhoneLookup } from '@/lib/directory';
import { formatTarget, reportsFor, resolveTarget } from '@/lib/nostr';
import { parseShortPayment, readAmount, type ShortPayment } from '@/lib/paymentLink';
import { parseZafyAddress } from '@/lib/phone';
import { cleanDestination, onScan } from '@/lib/scan';
import { colors, fonts } from '@/theme';

const KIND_LABEL = {
  invoice: 'send.kindInvoice',
  sparkInvoice: 'send.kindSparkInvoice',
  spark: 'send.kindSpark',
  bitcoin: 'send.kindBitcoin',
  other: 'send.kindOther',
} as const satisfies Record<Destination['kind'], string>;

/** Pourquoi un numéro ne peut pas être payé. */
const ALIAS_ERROR = {
  none: 'send.zafyNone',
  contested: 'send.zafyContested',
  error: 'send.zafyError',
} as const;

/** Montant demandé par un lien (dans la devise de celui qui demande) → texte du champ, dans la devise de l'utilisateur. */
function requestedInput({ amount, currency: from }: Omit<ShortPayment, 'phone'>) {
  const { currency } = getCurrencyState();
  if (!amount || !from) return null;
  return from === currency
    ? formatAmountInput(String(amount).replace('.', ','), currency)
    : satsToInput(toSats(amount, from), currency);
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Signalements Nostr du destinataire. `error` = relais injoignables : on ne sait pas, on ne rassure pas. */
type ReportsState =
  | { status: 'checking' }
  | { status: 'error' }
  | { status: 'done'; target: string; count: number; fromContacts: number };

/** Adresse Zafy (« 771234567@zafy ») recherchée dans l'annuaire. */
type AliasState = { phone: string } & (PhoneLookup | { status: 'error' });

/** 02 — Envoyer : facture Lightning, adresse Spark ou adresse Bitcoin. */
export default function Envoyer() {
  const { t } = useT();
  const { balanceSats, refresh } = useWallet();
  const { currency, format, unit, decimals, inputToSats, formatInput, inputFromSats, inputHint, quickAmounts } =
    useCurrency();
  // Lien de paiement ouvert (« /payer ») : la facture arrive déjà remplie
  const params = useLocalSearchParams<{ to?: string; m?: string; c?: string }>();
  const [to, setTo] = useState(() => (params.to ? cleanDestination(params.to) : ''));
  /** Montant saisi dans la devise choisie (converti en sats pour l'envoi). */
  const [amount, setAmount] = useState(() => requestedInput(readAmount(params.m, params.c)) ?? quickAmounts[1]);
  /** Destination reconnue, avec le texte analysé (pour ignorer un résultat qui ne correspond plus au champ). */
  const [dest, setDest] = useState<(Destination & { input: string }) | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Carte Zafy scannée (personne pas encore dans l'annuaire). */
  const [card, setCard] = useState<ContactCard | null>(null);
  /** `null` = rien à vérifier (champ vide ou destination non reconnue). */
  const [reports, setReports] = useState<ReportsState | null>(null);
  const [alias, setAlias] = useState<AliasState | null>(null);

  const { contacts, find } = useContacts();
  const input = to.trim();
  // Numéro ou « 771234567@zafy » : on paie l'adresse Spark publiée dans l'annuaire Zafy
  const aliasPhone = parseZafyAddress(input);
  const aliasResult = aliasPhone && alias?.phone === aliasPhone ? alias : null;
  const zafyProfile = aliasResult?.status === 'found' ? aliasResult.profile : null;
  /** Ce qui est réellement payé : l'adresse trouvée pour un numéro, sinon ce qui a été saisi. */
  const payTo = aliasPhone ? (zafyProfile?.address ?? '') : input;
  const current = dest?.input === payTo ? dest : null;
  const lookingUp = !!aliasPhone && !aliasResult;
  const reading = lookingUp || (payTo.length >= 10 && !current);
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
    (payTo ? find(payTo) : null) ?? (current?.identityPublicKey ? find(`sparkid:${current.identityPublicKey}`) : null);
  const quick = quickAmounts.find((q) => q === amount);

  // Numéro saisi : cherche le portefeuille Zafy lié dans l'annuaire
  useEffect(() => {
    if (!aliasPhone) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      lookupPhone(aliasPhone)
        .then((res) => !cancelled && setAlias({ phone: aliasPhone, ...res }))
        .catch(() => !cancelled && setAlias({ phone: aliasPhone, status: 'error' }));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [aliasPhone]);

  // Cherche sur Nostr si ce destinataire a été signalé (un numéro inclut le compte Zafy qui lui est lié)
  const reportInput = aliasPhone ? `phone:${aliasPhone}` : payTo;
  const contactIdentities = contacts.map((c) => c.identity).filter((id): id is string => !!id);
  const identitiesKey = contactIdentities.join(',');
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const target = await resolveTarget(reportInput).catch(() => null);
      if (cancelled) return;
      if (!target) return setReports(null);
      setReports({ status: 'checking' });
      try {
        const summary = await reportsFor(target, identitiesKey ? identitiesKey.split(',') : []);
        if (!cancelled) {
          setReports({ status: 'done', target, count: summary?.count ?? 0, fromContacts: summary?.fromContacts ?? 0 });
        }
      } catch {
        if (!cancelled) setReports({ status: 'error' });
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reportInput, identitiesKey]);

  // Reconnaît la destination dès qu'elle est saisie ou collée (ou trouvée dans l'annuaire).
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (payTo.length < 10) return setDest(null);
      describeDestination(payTo)
        .then((d) => !cancelled && setDest({ ...d, input: payTo }))
        .catch(() => !cancelled && setDest({ kind: 'other', input: payTo }));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [payTo]);

  // Contact choisi dans l'annuaire
  useEffect(() => onContactPick((c) => setTo(c.address)), []);

  // Résultat du scanner (écran /scanner)
  useEffect(
    () =>
      onScan((data) => {
        setCard(parseContactCard(data));
        // Lien court de paiement scanné : le montant demandé est pré-rempli
        const requested = parseShortPayment(data);
        const input = requested ? requestedInput(requested) : null;
        if (input) setAmount(input);
        setTo(cleanDestination(data));
      }),
    [],
  );

  const paste = async () => setTo(cleanDestination(await Clipboard.getStringAsync()));

  const send = async () => {
    setError(null);
    if (reading) return;
    if (aliasResult && aliasResult.status !== 'found') {
      return setError(t(ALIAS_ERROR[aliasResult.status]));
    }
    if (!current || current.kind === 'other') {
      return setError(t('send.pasteSomething'));
    }
    if (sats <= 0) return setError(t('send.enterAmount'));
    if (balanceSats !== null && sats > balanceSats) return setError(t('send.insufficient'));

    setSending(true);
    try {
      // La facture fixe déjà son montant : on n'en envoie pas un second.
      const prepared = await prepareSend(payTo, current.amountSats ? 0 : sats);
      const recipientName = contact?.name ?? zafyProfile?.name;
      const ok = await confirmAction(
        t('send.confirmTitle', { amount: format(prepared.amountSats) }),
        [
          t('send.fees', { amount: format(prepared.feeSats) }),
          t('send.total', { amount: format(prepared.amountSats + prepared.feeSats) }),
          // Montant exact réellement envoyé, quand on a saisi dans une monnaie
          currency === 'SAT' ? null : t('send.exactSats', { n: formatNumber(prepared.amountSats + prepared.feeSats) }),
          recipientName ? t('send.confirmTo', { name: recipientName }) : null,
          // Dernier rappel avant de payer quelqu'un de signalé, ou quand on n'a pas pu vérifier
          reports?.status === 'done' && reports.count > 0
            ? t(plural('send.confirmReported', reports.count), { n: reports.count })
            : reports?.status === 'error'
              ? t('send.confirmUnchecked')
              : null,
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
          ...(recipientName ? { name: recipientName } : {}),
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
          {/* Numéro ou adresse Zafy : à qui il appartient dans l'annuaire */}
          {aliasPhone && !contact ? (
            lookingUp ? (
              <Badge label={t('send.zafyLooking')} tone="neutral" />
            ) : zafyProfile ? (
              <Badge
                label={t('send.zafyFound', { name: zafyProfile.name, phone: formatTarget(`phone:${aliasPhone}`) })}
                tone="warning"
                icon={<Icon name="user" size={14} color={colors.warningText} strokeWidth={2.6} />}
              />
            ) : aliasResult ? (
              <Badge
                label={t(ALIAS_ERROR[aliasResult.status as keyof typeof ALIAS_ERROR])}
                tone={aliasResult.status === 'contested' ? 'danger' : 'warning'}
                icon={<Icon name="alert" size={14} color={colors.warningText} strokeWidth={2.6} />}
              />
            ) : null
          ) : null}
          {current ? (
            <Badge label={t(KIND_LABEL[current.kind])} tone={current.kind === 'other' ? 'warning' : 'neutral'} />
          ) : null}
          {/* Signalements Nostr du destinataire */}
          {reports?.status === 'checking' ? (
            <Badge label={t('send.checking')} tone="neutral" />
          ) : reports?.status === 'error' ? (
            <Badge
              label={t('send.reportsUnchecked')}
              tone="warning"
              icon={<Icon name="alert" size={14} color={colors.warningText} strokeWidth={2.8} />}
            />
          ) : reports?.status === 'done' && reports.count > 0 ? (
            <Pressable onPress={() => router.push({ pathname: '/alerte/[id]', params: { id: reports.target } })}>
              <Badge
                label={[
                  t(plural('send.reportedBy', reports.count), { n: reports.count }),
                  reports.fromContacts > 0
                    ? t(plural('send.fromContacts', reports.fromContacts), { n: reports.fromContacts })
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                tone="danger"
                icon={<Icon name="alert" size={14} color={colors.dangerText} strokeWidth={2.8} />}
              />
            </Pressable>
          ) : reports?.status === 'done' ? (
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
