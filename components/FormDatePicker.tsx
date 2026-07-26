import { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';
import { addDays, getHoustonDate } from '@/lib/calendarUtils';

type FormDatePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  layout?: 'stacked' | 'grid';
  required?: boolean;
  minDate?: string;
  maxDate?: string;
};

export function FormDatePicker({
  label,
  value,
  onChange,
  layout = 'stacked',
  required = false,
  minDate,
  maxDate,
}: FormDatePickerProps) {
  const earliestDate = minDate || getHoustonDate();
  const latestDate = maxDate || addDays(earliestDate, 179);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(value || earliestDate);
  const selectedDates = useMemo(
    () => value
      ? {
          [value]: {
            selected: true,
            selectedColor: colors.oxblood,
            selectedTextColor: colors.ivory,
          },
        }
      : {},
    [value],
  );

  const openCalendar = () => {
    setVisibleMonth(value || earliestDate);
    setOpen(true);
  };

  const chooseDate = (day: DateData) => {
    onChange(day.dateString);
    setOpen(false);
  };

  const firstMonth = earliestDate.slice(0, 7);
  const lastMonth = latestDate.slice(0, 7);
  const activeMonth = visibleMonth.slice(0, 7);

  return (
    <View style={[styles.field, layout === 'grid' && styles.gridField]}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.requiredMark}> *</Text> : null}
      </Text>
      <Pressable
        accessibilityLabel={`${label}${required ? ', required' : ''}: ${value ? formatDate(value) : 'Not selected'}`}
        accessibilityRole="button"
        onPress={openCalendar}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <CalendarDays color={value ? colors.oxblood : colors.onIvoryMuted} size={19} strokeWidth={1.9} />
        <Text
          numberOfLines={1}
          style={[styles.triggerText, !value && styles.placeholderText]}
        >
          {value ? formatDate(value) : 'Select date'}
        </Text>
        <ChevronDown color={colors.oxblood} size={18} strokeWidth={2} />
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
        transparent
        visible={open}
      >
        <View accessibilityViewIsModal style={styles.modalRoot}>
          <Pressable
            accessible={false}
            onPress={() => setOpen(false)}
            style={styles.backdrop}
          />
          <View style={styles.calendarDialog}>
            <View style={styles.dialogHeader}>
              <View style={styles.dialogTitleBlock}>
                <Text style={styles.dialogEyebrow}>Event date</Text>
                <Text style={styles.dialogTitle}>Choose a date</Text>
              </View>
              <Pressable
                accessibilityLabel="Close date picker"
                accessibilityRole="button"
                onPress={() => setOpen(false)}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <X color={colors.onIvoryMuted} size={20} strokeWidth={2} />
              </Pressable>
            </View>

            <Calendar
              current={visibleMonth}
              disableAllTouchEventsForDisabledDays
              disableArrowLeft={activeMonth <= firstMonth}
              disableArrowRight={activeMonth >= lastMonth}
              enableSwipeMonths
              hideExtraDays
              markedDates={selectedDates}
              maxDate={latestDate}
              minDate={earliestDate}
              monthFormat="MMMM yyyy"
              onDayPress={chooseDate}
              onMonthChange={(month) => setVisibleMonth(month.dateString)}
              renderArrow={(direction) => direction === 'left'
                ? <ChevronLeft color={colors.oxblood} size={21} strokeWidth={2} />
                : <ChevronRight color={colors.oxblood} size={21} strokeWidth={2} />}
              showSixWeeks
              style={styles.calendar}
              testID="event-date-calendar"
              theme={{
                arrowColor: colors.oxblood,
                calendarBackground: colors.ivory,
                dayTextColor: colors.onIvory,
                monthTextColor: colors.onIvory,
                selectedDayBackgroundColor: colors.oxblood,
                selectedDayTextColor: colors.ivory,
                textDayFontFamily: fonts.bodyMedium,
                textDayFontSize: 15,
                textDayHeaderFontFamily: fonts.bodyBold,
                textDayHeaderFontSize: typography.overline,
                textDisabledColor: colors.ivoryMuted,
                textMonthFontFamily: fonts.displayMedium,
                textMonthFontSize: 20,
                todayTextColor: colors.oxblood,
              }}
            />

            <View style={styles.dialogFooter}>
              <Text style={styles.rangeText}>Available through {formatDate(latestDate)}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onChange(earliestDate);
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}
              >
                <Text style={styles.todayButtonText}>Choose today</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
    minWidth: 0,
    width: '100%',
  },
  gridField: {
    flexBasis: 220,
    flexGrow: 1,
    width: 'auto',
  },
  label: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.bodyBold,
    fontSize: typography.label,
  },
  requiredMark: {
    color: colors.oxblood,
  },
  trigger: {
    alignItems: 'center',
    backgroundColor: colors.ivoryRaised,
    borderColor: colors.onIvoryLine,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.82,
  },
  triggerText: {
    color: colors.onIvory,
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
  placeholderText: {
    color: colors.onIvoryMuted,
  },
  modalRoot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  backdrop: {
    bottom: 0,
    backgroundColor: 'rgba(9, 8, 7, 0.76)',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  calendarDialog: {
    ...shadows.medium,
    backgroundColor: colors.ivory,
    borderColor: colors.onIvoryLine,
    borderRadius: radii.md,
    borderWidth: 1,
    maxWidth: 420,
    overflow: 'hidden',
    width: '100%',
  },
  dialogHeader: {
    alignItems: 'center',
    borderBottomColor: colors.onIvoryLine,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dialogTitleBlock: {
    flex: 1,
  },
  dialogEyebrow: {
    color: colors.oxblood,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  dialogTitle: {
    color: colors.onIvory,
    fontFamily: fonts.displayMedium,
    fontSize: typography.title,
    lineHeight: 28,
    marginTop: spacing.xxs,
  },
  closeButton: {
    alignItems: 'center',
    borderColor: colors.onIvoryLine,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  calendar: {
    backgroundColor: colors.ivory,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  dialogFooter: {
    alignItems: 'center',
    borderTopColor: colors.onIvoryLine,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rangeText: {
    color: colors.onIvoryMuted,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: typography.overline,
    lineHeight: 17,
    minWidth: 150,
  },
  todayButton: {
    alignItems: 'center',
    borderColor: colors.oxblood,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  todayButtonText: {
    color: colors.oxblood,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
  },
});
