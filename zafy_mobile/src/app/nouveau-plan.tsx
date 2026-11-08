'use no memo'; // Dates et libellés traduits hors composant : recalculés à chaque rendu (changement de langue)

import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateRangePicker } from '@/components/DateRangePicker';
import { AmountInput, ChoiceGroup, Input, Label, RecipientInput } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCurrency } from '@/hooks/useCurrency';
import { useT } from '@/i18n';
import { formatInput as formatInputFor, getCurrencyState, inputFromSats } from '@/lib/currency';
import { describeDestination } from '@/lib/breez';
import { parseContactCard, parseShortCard } from '@/lib/contactCard';
import { lookupPhone, resolveZafyAddress } from '@/lib/directory';
import { normalizePhone } from '@/lib/phone';
import { onContactPick } from '@/lib/contacts';
import { ensureNotificationPermission } from '@/lib/notifications';
import {
  atTime,
  createPlan,
  describeSchedule,
  getPlan,
  planSats,
  isPast,
  parseTime,
  type Frequency,
  updatePlan,
} from '@/lib/plans';
import { cleanDestination, onScan } from '@/lib/scan';
import { colors, fonts } from '@/theme';
import { formatShortDate } from '@/utils/date';

const FREQUENCIES = ['once', 'weekly', 'monthly'] as const satisfies readonly Frequency[];
const FREQUENCY_LABEL = { once: 'plans.freqOnce', weekly: 'plans.freqWeekly', monthly: 'plans.freqMonthly' } as const;

const tomorrow = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
};

/** Saisie libre de l'heure : « 1430 » s'affiche « 14:30 ». */
const formatTimeInput = (text: string) => {
  const d = text.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, -2)}:${d.slice(-2)}`;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** 11 — Nouveau paiement planifié (ou modification avec `?id=`) */
export default function NouveauPlan() {
  const { t } = useT();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { unit, decimals, inputToSats, inputToFiat, formatInput, inputHint } = useCurrency();
  const [originalDate, setOriginalDate] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [date, setDate] = useState<Date>(tomorrow);
  const [time, setTime] = useState('09:00');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Montant saisi dans la devise choisie ; les sats sont recalculés au taux du jour à chaque paiement. */
  const sats = inputToSats(amount);
  const parsedTime = parseTime(time);
  const when = parsedTime ? atTime(date, parsedTime.hours, parsedTime.minutes) : null;
  const nextDate = (when ?? atTime(date, 9, 0)).toISOString();
  const schedule = describeSchedule({ frequency, nextDate });

  // Modification : on reprend les valeurs du paiement
  useEffect(() => {
    if (!id) return;
    getPlan(id).then((plan) => {
      if (!plan) return;
      const d = new Date(plan.nextDate);
      setOriginalDate(plan.nextDate);
      setName(plan.name);
      setTo(plan.destination);
      // Montant fixé dans la devise affichée : on le reprend tel quel, sinon on convertit
      const { currency } = getCurrencyState();
      setAmount(
        plan.fiat?.currency === currency
          ? formatInputFor(String(plan.fiat.amount).replace('.', ','), currency)
          : inputFromSats(planSats(plan), currency),
      );
      setFrequency(plan.frequency);
      setDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    });
  }, [id]);

  // Contact choisi dans l'annuaire : son adresse, et son nom si le champ est vide
  useEffect(
    () =>
      onContactPick((c) => {
        setTo(c.address);
        setName((n) => n || c.name);
      }),
    [],
  );

  // Résultat du scanner de QR code
  useEffect(
    () =>
      onScan((data) => {
        // Lien court de carte : un paiement répété a besoin de l'adresse, on la cherche dans l'annuaire
        const shortPhone = parseShortCard(data);
        if (shortPhone) {
          lookupPhone(normalizePhone(shortPhone))
            .then((res) => {
              if (res.status !== 'found') return;
              setTo(res.profile.address);
              setName((n) => n || res.profile.name);
            })
            .catch(() => {});
          return;
        }
        setTo(cleanDestination(data));
        // Carte Zafy : son prénom sert de nom au paiement si le champ est vide
        const card = parseContactCard(data);
        if (card) setName((n) => n || card.name);
      }),
    [],
  );

  const save = async () => {
    setError(null);
    if (!name.trim()) return setError(t('plans.errName'));
    if (!to.trim()) return setError(t('plans.errAddress'));
    if (sats <= 0) return setError(t('send.enterAmount'));
    if (!when) return setError(t('plans.errTime'));
    // Une échéance déjà due peut être gardée telle quelle lors d'une modification
    if (isPast(when) && nextDate !== originalDate) return setError(t('plans.errPast'));

    setSaving(true);
    try {
      // Adresse Zafy ou numéro : on enregistre l'adresse Spark du compte trouvé dans l'annuaire
      let zafy;
      try {
        zafy = await resolveZafyAddress(to);
      } catch (e) {
        return setError(e instanceof Error ? e.message : String(e));
      }
      const destination = zafy?.address ?? to.trim();
      // Paiement répété : il faut une adresse réutilisable, pas une facture (valable une seule fois)
      const dest = await describeDestination(destination).catch(() => null);
      if (dest?.kind === 'invoice' || dest?.kind === 'sparkInvoice') {
        return setError(t('plans.errInvoice'));
      }
      if (dest?.kind !== 'spark') return setError(t('plans.errUnknownAddress'));

      // Sans autorisation, le paiement est quand même enregistré : il apparaîtra « À payer » dans la liste.
      await ensureNotificationPermission();
      const input = {
        name: name.trim(),
        destination,
        amountSats: sats,
        fiat: inputToFiat(amount),
        frequency,
        nextDate,
      };
      if (id) await updatePlan(id, input);
      else await createPlan(input);
      router.back();
    } catch (e) {
      setError(t('plans.saveFailed', { error: e instanceof Error ? e.message : String(e) }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen header={<ScreenHeader title={id ? t('plans.edit') : t('plans.new')} />}>
      <Card style={styles.section}>
        <View style={styles.gap8}>
          <Label>{t('plans.what')}</Label>
          <Input value={name} onChangeText={setName} placeholder={t('plans.whatPlaceholder')} autoCapitalize="sentences" />
        </View>
        <View style={styles.gap8}>
          <Label>{t('send.to')}</Label>
          <RecipientInput
            value={to}
            onChangeText={setTo}
            right={
              <View style={styles.inputActions}>
                <Pressable
                  onPress={() => router.push({ pathname: '/contacts', params: { pick: '1' } })}
                  accessibilityLabel={t('a11y.chooseContact')}
                  style={styles.inputAction}>
                  <Icon name="user" size={18} color={colors.navy} />
                </Pressable>
                <Pressable
                  onPress={async () => setTo(cleanDestination(await Clipboard.getStringAsync()))}
                  accessibilityLabel={t('common.paste')}
                  style={styles.inputAction}>
                  <Icon name="copy" size={18} color={colors.navy} />
                </Pressable>
                <Pressable
                  onPress={() => router.push('/scanner')}
                  accessibilityLabel={t('common.scanQr')}
                  style={[styles.inputAction, styles.scan]}>
                  <Icon name="scan" size={18} color={colors.turquoise} />
                </Pressable>
              </View>
            }
          />
        </View>
      </Card>

      <Card style={styles.gap6}>
        <Label>{t('common.amount')}</Label>
        <AmountInput
          value={amount}
          onChangeText={(t) => setAmount(formatInput(t))}
          unit={unit}
          decimals={decimals}
          hint={sats > 0 ? inputHint(sats) : null}
        />
      </Card>

      <Card style={styles.section}>
        <Label>{t('plans.when')}</Label>
        <ChoiceGroup
          options={FREQUENCIES}
          value={frequency}
          onChange={setFrequency}
          columns={3}
          segmented
          getLabel={(f) => t(FREQUENCY_LABEL[f])}
        />
        <View style={styles.fields}>
          <Pressable
            onPress={() => setCalendarOpen(true)}
            style={({ pressed }) => [styles.field, pressed && { opacity: 0.7 }]}
            accessibilityLabel={t('a11y.chooseDate')}>
            <Icon name="calendar" size={20} color={colors.successText} />
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>{frequency === 'once' ? t('plans.date') : t('plans.firstSend')}</Text>
              <Text style={styles.fieldValue}>{formatShortDate(date)}</Text>
            </View>
          </Pressable>
          <View style={[styles.field, styles.timeField]}>
            <Icon name="clock" size={20} color={colors.successText} />
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>{t('plans.time')}</Text>
              <TextInput
                value={time}
                onChangeText={(t) => setTime(formatTimeInput(t))}
                placeholder="09:00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={5}
                accessibilityLabel={t('plans.timeA11y')}
                style={styles.timeInput}
              />
            </View>
          </View>
        </View>
        <Text style={styles.summary}>{schedule}</Text>
      </Card>

      {/* Jamais d'envoi sans l'utilisateur : un rappel, puis il confirme */}
      <View style={styles.note}>
        <Icon name="bell" size={18} color={colors.successText} />
        <Text style={styles.noteText}>{t('plans.confirmNote')}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        title={saving ? t('common.saving') : id ? t('common.save') : t('plans.schedule')}
        icon={saving ? <ActivityIndicator color={colors.navy} /> : undefined}
        onPress={saving ? undefined : save}
      />

      <DateRangePicker
        single
        minDate={new Date()}
        visible={calendarOpen}
        value={{ start: date, end: date }}
        onClose={() => setCalendarOpen(false)}
        onApply={(r) => {
          if (r) setDate(r.start);
          setCalendarOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap6: { gap: 6 },
  gap8: { gap: 8 },
  inputActions: { flexDirection: 'row', gap: 6 },
  inputAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scan: { backgroundColor: colors.navy },
  section: { gap: 14 },
  fields: { flexDirection: 'row', gap: 10 },
  field: {
    flex: 1,
    minHeight: 60,
    borderRadius: 14,
    backgroundColor: colors.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  timeField: { flex: 0.8 },
  fieldBody: { flex: 1, gap: 2 },
  fieldLabel: { fontFamily: fonts.inter400, fontSize: 12, color: colors.textSecondary },
  fieldValue: { fontFamily: fonts.inter600, fontSize: 16, color: colors.navy },
  timeInput: { fontFamily: fonts.inter600, fontSize: 16, color: colors.navy, padding: 0, margin: 0 },
  summary: { fontFamily: fonts.inter500, fontSize: 13, color: colors.successText, textAlign: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noteText: { flex: 1, fontFamily: fonts.inter400, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  error: { fontFamily: fonts.inter600, fontSize: 14, color: colors.dangerText, textAlign: 'center' },
});
