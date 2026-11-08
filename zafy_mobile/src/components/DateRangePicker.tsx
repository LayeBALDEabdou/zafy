'use no memo'; // Dates et libellés traduits hors composant : recalculés à chaque rendu (changement de langue)

import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useT } from '@/i18n';
import { colors, fonts } from '@/theme';
import { formatShortDate, isSameDay, monthLong, startOfDay, weekdayInitials } from '@/utils/date';

export type DateRange = { start: Date; end: Date };

type Props = {
  visible: boolean;
  value: DateRange | null;
  onClose: () => void;
  /** `null` = filtre effacé. */
  onApply: (range: DateRange | null) => void;
  /** Dernier jour sélectionnable : aujourd'hui par défaut en mode plage, `null` = sans limite. */
  maxDate?: Date | null;
  /** Premier jour sélectionnable (ex. aujourd'hui pour une date à venir). */
  minDate?: Date;
  /** Une seule date au lieu d'une plage « du… au… ». */
  single?: boolean;
};

const OPEN_MS = 320;
/** Distance de glissement de la feuille (plus haute que son contenu). */
const SHEET_TRAVEL = 640;

/** Jours du mois, précédés de cases vides pour commencer un lundi. */
function monthGrid(year: number, month: number) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= count; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** Calendrier en feuille du bas : 1er appui = début, 2e appui = fin. */
export function DateRangePicker({ visible, value, onClose, onApply, maxDate, minDate, single }: Props) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const maxDay = maxDate === undefined ? (single ? null : new Date()) : maxDate;
  const max = maxDay ? startOfDay(maxDay) : null;
  const min = minDate ? startOfDay(minDate) : null;
  // Mois affiché à l'ouverture : la sélection, sinon la limite, sinon aujourd'hui
  const initialRef = () => value?.end ?? maxDay ?? minDate ?? new Date();
  const [start, setStart] = useState<Date | null>(value?.start ?? null);
  const [end, setEnd] = useState<Date | null>(value?.end ?? null);
  const [cursor, setCursor] = useState(() => {
    const ref = initialRef();
    return { year: ref.getFullYear(), month: ref.getMonth() };
  });

  // Le Modal gère le fondu (ouverture et fermeture) ; la feuille glisse en plus à l'ouverture.
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) });
  }, [visible, progress]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [SHEET_TRAVEL, 0]) }],
  }));

  // Repart de la sélection appliquée à chaque ouverture.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setStart(value?.start ?? null);
      setEnd(value?.end ?? null);
      const ref = initialRef();
      setCursor({ year: ref.getFullYear(), month: ref.getMonth() });
    }
  }

  const pick = (day: Date) => {
    if (single) {
      setStart(day);
      setEnd(day);
    } else if (!start || end || day < start) {
      setStart(day);
      setEnd(null);
    } else {
      setEnd(day);
    }
  };

  const shiftMonth = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const canGoNext = !max || new Date(cursor.year, cursor.month + 1, 1) <= max;
  // Dernier jour du mois précédent encore sélectionnable ?
  const canGoPrev = !min || new Date(cursor.year, cursor.month, 0) >= min;

  const hint = single
    ? start
      ? t('dateRange.on', { date: formatShortDate(start) })
      : t('dateRange.chooseSingle')
    : !start
    ? t('dateRange.chooseStart')
    : !end
      ? t('dateRange.chooseEnd', { date: formatShortDate(start) })
      : isSameDay(start, end)
        ? t('dateRange.on', { date: formatShortDate(start) })
        : t('dateRange.range', { start: formatShortDate(start), end: formatShortDate(end) });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <Animated.View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 4 }, sheetStyle]}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Text style={styles.title}>{single ? t('dateRange.titleSingle') : t('dateRange.titleRange')}</Text>
            <Pressable onPress={onClose} accessibilityLabel={t('common.close')} hitSlop={8} style={styles.close}>
              <Icon name="close" size={18} color={colors.navy} />
            </Pressable>
          </View>
          <Text style={styles.hint}>{hint}</Text>

          <View style={styles.monthRow}>
            <Pressable
              onPress={() => shiftMonth(-1)}
              disabled={!canGoPrev}
              accessibilityLabel={t('a11y.previousMonth')}
              style={[styles.nav, !canGoPrev && { opacity: 0.3 }]}>
              <Icon name="back" size={18} color={colors.navy} />
            </Pressable>
            <Text style={styles.month}>
              {monthLong(cursor.month)} {cursor.year}
            </Text>
            <Pressable
              onPress={() => shiftMonth(1)}
              disabled={!canGoNext}
              accessibilityLabel={t('a11y.nextMonth')}
              style={[styles.nav, !canGoNext && { opacity: 0.3 }]}>
              <Icon name="chevronRight" size={18} color={colors.navy} />
            </Pressable>
          </View>

          <View style={styles.grid}>
            {weekdayInitials().map((w, i) => (
              <Text key={i} style={styles.weekday}>
                {w}
              </Text>
            ))}
            {monthGrid(cursor.year, cursor.month).map((day, i) => {
              if (!day) return <View key={i} style={styles.cell} />;

              const disabled = (!!max && day > max) || (!!min && day < min);
              const isStart = !!start && isSameDay(day, start);
              const isEnd = !!end && isSameDay(day, end);
              const selected = isStart || isEnd;
              const inRange = !!start && !!end && day > start && day < end;
              const hasRange = !!start && !!end && !isSameDay(start, end);
              const today = isSameDay(day, new Date());

              return (
                <Pressable
                  key={i}
                  disabled={disabled}
                  onPress={() => pick(day)}
                  accessibilityLabel={formatShortDate(day)}
                  accessibilityState={{ selected, disabled }}
                  style={styles.cell}>
                  {/* Bande turquoise clair qui relie le début et la fin */}
                  {inRange ? <View style={[styles.band, StyleSheet.absoluteFill]} /> : null}
                  {isStart && hasRange ? <View style={[styles.band, styles.bandRight]} /> : null}
                  {isEnd && hasRange ? <View style={[styles.band, styles.bandLeft]} /> : null}
                  <View style={[styles.dayCircle, selected && styles.daySelected]}>
                    <Text
                      style={[
                        styles.day,
                        today && styles.dayToday,
                        selected && styles.dayTextSelected,
                        disabled && styles.dayDisabled,
                      ]}>
                      {day.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Button
              title={t('dateRange.clear')}
              variant="muted"
              height={52}
              style={styles.flex}
              onPress={() => {
                setStart(null);
                setEnd(null);
                onApply(null);
              }}
            />
            <Button
              title={t('dateRange.apply')}
              height={52}
              style={[styles.flex, !start && { opacity: 0.5 }]}
              onPress={() => start && onApply({ start, end: end ?? start })}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const CELL = 44;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(19, 33, 58, 0.45)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    gap: 12,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutralBg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  title: { fontFamily: fonts.sora700, fontSize: 18, color: colors.navy },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontFamily: fonts.inter500, fontSize: 14, color: colors.textSecondary, marginTop: -6 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  month: { fontFamily: fonts.sora600, fontSize: 16, color: colors.navy },
  nav: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: fonts.inter600,
    fontSize: 12,
    color: colors.textSecondary,
    paddingBottom: 6,
  },
  cell: { width: `${100 / 7}%`, height: CELL, alignItems: 'center', justifyContent: 'center', marginVertical: 1 },
  band: { backgroundColor: colors.successBg },
  bandRight: { position: 'absolute', top: 0, bottom: 0, left: '50%', right: 0 },
  bandLeft: { position: 'absolute', top: 0, bottom: 0, left: 0, right: '50%' },
  dayCircle: { width: CELL - 4, height: CELL - 4, borderRadius: (CELL - 4) / 2, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: colors.navy },
  day: { fontFamily: fonts.inter500, fontSize: 15, color: colors.navy },
  dayToday: { fontFamily: fonts.inter700, color: colors.successText },
  dayTextSelected: { fontFamily: fonts.inter700, color: colors.white },
  dayDisabled: { color: colors.neutralBg },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  flex: { flex: 1 },
});
