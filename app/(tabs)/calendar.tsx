import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { AppShell } from '@/components/AppShell';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { events as fallbackEvents, islamicCalendarYears, islamicEvents } from '@/data/mock';
import { fetchCalendarMonth } from '@/lib/api';
import {
  addMonths,
  buildCalendarMonth,
  CalendarDay,
  CalendarFilter,
  CalendarMonthPayload,
  downloadIcsFile,
  generateCalendarIcs,
  getHoustonDate,
  syncEventsToDeviceCalendar,
} from '@/lib/calendarUtils';
import { getEventTone, getEventToneLabel } from '@/lib/eventPresentation';

const filterOptions: { label: string; value: CalendarFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Anjuman', value: 'anjuman' },
  { label: 'Brothers', value: 'brothers' },
  { label: 'Sisters', value: 'sisters' },
  { label: 'Family', value: 'family' },
];

const fallbackCalendar = buildCalendarMonth({
  date: getHoustonDate(),
  filter: 'all',
  events: fallbackEvents,
  calendarYears: islamicCalendarYears,
  islamicEvents,
});

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const [selectedDate, setSelectedDate] = useState(getHoustonDate());
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [calendar, setCalendar] = useState<CalendarMonthPayload>(fallbackCalendar);
  const [notice, setNotice] = useState('');
  const isCompact = width < 760;

  useEffect(() => {
    let active = true;
    fetchCalendarMonth(selectedDate, filter)
      .then((payload) => {
        if (active) setCalendar(payload);
      })
      .catch(() => {
        if (active) {
          setCalendar(buildCalendarMonth({
            date: selectedDate,
            filter,
            events: fallbackEvents,
            calendarYears: islamicCalendarYears,
            islamicEvents,
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [filter, selectedDate]);

  const visibleEvents = useMemo(() => calendar.events, [calendar.events]);
  const monthDays = isCompact ? calendar.days.filter((day) => day.isCurrentMonth) : calendar.days;
  const anjumanCount = visibleEvents.filter((event) => event.isAnjumanSchedule).length;

  const downloadMonth = () => {
    if (!visibleEvents.length) {
      setNotice('No visible events to download for this month.');
      return;
    }

    const ics = generateCalendarIcs(
      visibleEvents,
      filter === 'anjuman' ? 'Pasban-e-Aza Anjuman Schedule' : 'Pasban-e-Aza Schedule',
    );
    const downloaded = downloadIcsFile(ics, `pasbaneaza-${calendar.month.startDate}-${filter}.ics`);
    setNotice(downloaded ? 'Calendar file downloaded.' : 'Calendar export is ready for native sync.');
  };

  const syncMonth = async () => {
    const result = await syncEventsToDeviceCalendar(visibleEvents);
    setNotice(result.message);
  };

  return (
    <AppShell title="Calendar" subtitle="Browse the full Houston schedule by month">
      <View style={styles.heroPanel}>
        <View style={styles.monthHeader}>
          <View style={styles.monthTitleBlock}>
            <Text style={styles.eyebrow}>Schedule Calendar</Text>
            <Text style={styles.monthTitle}>{calendar.month.label}</Text>
            <Text style={styles.monthMeta}>
              {visibleEvents.length} visible events, {anjumanCount} on the Anjuman schedule
            </Text>
          </View>

          <View style={styles.monthActions}>
            <Pressable onPress={() => setSelectedDate(addMonths(selectedDate, -1))} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>Prev</Text>
            </Pressable>
            <Pressable onPress={() => setSelectedDate(getHoustonDate())} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>Today</Text>
            </Pressable>
            <Pressable onPress={() => setSelectedDate(addMonths(selectedDate, 1))} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>Next</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.filterRow}>
          {filterOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setFilter(option.value)}
              style={filter === option.value ? styles.activeFilter : styles.filterButton}
            >
              <Text style={filter === option.value ? styles.activeFilterText : styles.filterText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.exportRow}>
          <ActionButton onPress={downloadMonth} variant="outline">Download .ics</ActionButton>
          <ActionButton onPress={syncMonth}>Sync To Device</ActionButton>
        </View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </View>

      {!isCompact ? (
        <View style={styles.weekHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={styles.weekLabel}>{day}</Text>
          ))}
        </View>
      ) : null}

      <View style={styles.monthGrid}>
        {monthDays.map((day) => (
          <CalendarCell key={day.date} day={day} compact={isCompact} />
        ))}
      </View>
    </AppShell>
  );
}

function CalendarCell({ day, compact }: { day: CalendarDay; compact: boolean }) {
  const shownEvents = day.events.slice(0, compact ? 6 : 3);
  const hiddenCount = Math.max(day.events.length - shownEvents.length, 0);

  return (
    <View
      style={[
        styles.dayCell,
        compact && styles.compactDayCell,
        !day.isCurrentMonth && styles.offMonthCell,
        day.isToday && styles.todayCell,
      ]}
    >
      <View style={styles.dayHeader}>
        <View>
          <Text style={[styles.dayNumber, !day.isCurrentMonth && styles.offMonthText]}>
            {compact ? `${day.weekday}, ${day.displayDate}` : day.dayOfMonth}
          </Text>
          <Text style={styles.hijriText}>{day.islamicDate ? day.islamicDate.label : 'Hijri date pending'}</Text>
        </View>
        {day.isToday ? <Text style={styles.todayPill}>Today</Text> : null}
      </View>

      {day.islamicEvents.length ? (
        <View style={styles.observanceStack}>
          {day.islamicEvents.map((event) => (
            <Text key={event.id} style={styles.observanceText}>{event.title}</Text>
          ))}
        </View>
      ) : null}

      <View style={styles.eventStack}>
        {shownEvents.map((event) => (
          <View key={event.id} style={[styles.eventChip, styles[`${getEventTone(event)}EventChip`]]}>
            <Text style={styles.eventChipText} numberOfLines={2}>
              <Text style={[styles.eventPrefix, styles[`${getEventTone(event)}EventPrefix`]]}>{shortPrefix(getEventToneLabel(event))}</Text>
              {'  '}
              {event.time ? `${event.time} ` : ''}
              {event.contactName || event.title}
            </Text>
            {event.isAnjumanSchedule ? (
              <Image source={require('@/assets/images/pasban-logo-white.png')} style={styles.eventLogo} resizeMode="contain" />
            ) : null}
          </View>
        ))}
        {hiddenCount ? <Text style={styles.moreText}>+{hiddenCount} more</Text> : null}
        {!day.events.length && compact ? <Text style={styles.emptyDayText}>No programs listed</Text> : null}
      </View>
    </View>
  );
}

function shortPrefix(value?: string) {
  return String(value || 'Community').slice(0, 3).toUpperCase();
}

const styles = StyleSheet.create({
  heroPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  monthHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  monthTitleBlock: {
    flex: 1,
    minWidth: 260,
  },
  eyebrow: {
    color: colors.gold,
    fontSize: typography.label,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  monthTitle: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
    marginTop: spacing.xs,
  },
  monthMeta: {
    color: colors.muted,
    fontSize: typography.body,
    marginTop: spacing.xs,
  },
  monthActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  smallButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  smallButtonText: {
    color: colors.ink,
    fontSize: typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  filterButton: {
    backgroundColor: colors.night,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  activeFilter: {
    backgroundColor: colors.red,
    borderColor: colors.red,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  filterText: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '900',
  },
  activeFilterText: {
    color: colors.ivory,
    fontSize: typography.small,
    fontWeight: '900',
  },
  exportRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  notice: {
    color: colors.gold,
    fontSize: typography.small,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  weekHeader: {
    backgroundColor: colors.nightRaised,
    borderColor: colors.border,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
  },
  weekLabel: {
    color: colors.muted,
    flexBasis: '14.2857%',
    fontSize: typography.label,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  monthGrid: {
    borderColor: colors.border,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderRightColor: colors.border,
    borderRightWidth: 1,
    flexBasis: '14.2857%',
    minHeight: 154,
    padding: spacing.sm,
  },
  compactDayCell: {
    flexBasis: '100%',
    minHeight: 122,
  },
  offMonthCell: {
    backgroundColor: colors.night,
  },
  todayCell: {
    borderColor: colors.gold,
    borderWidth: 1,
  },
  dayHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  dayNumber: {
    color: colors.ink,
    fontSize: typography.lead,
    fontWeight: '900',
  },
  hijriText: {
    color: colors.textSubtle,
    fontSize: typography.label,
    fontWeight: '800',
    marginTop: 2,
  },
  offMonthText: {
    color: colors.textSubtle,
  },
  todayPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    borderRadius: 999,
    color: colors.night,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    textTransform: 'uppercase',
  },
  observanceStack: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  observanceText: {
    color: colors.gold,
    fontSize: typography.label,
    fontWeight: '900',
  },
  eventStack: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  eventChip: {
    alignItems: 'flex-start',
    backgroundColor: colors.nightRaised,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  committedEventChip: {
    backgroundColor: colors.committedBg,
    borderColor: colors.gold,
  },
  sistersEventChip: {
    backgroundColor: colors.sistersBg,
    borderColor: colors.blue,
  },
  communityEventChip: {
    backgroundColor: colors.communityBg,
    borderColor: colors.communityBorder,
  },
  eventChipText: {
    color: colors.ink,
    fontSize: typography.label,
    fontWeight: '800',
    lineHeight: 15,
  },
  eventPrefix: {
    color: colors.gold,
    fontWeight: '900',
  },
  committedEventPrefix: {
    color: colors.gold,
  },
  sistersEventPrefix: {
    color: colors.blue,
  },
  communityEventPrefix: {
    color: '#75d39b',
  },
  eventLogo: {
    height: 16,
    width: 16,
  },
  moreText: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: '800',
  },
  emptyDayText: {
    color: colors.textSubtle,
    fontSize: typography.small,
  },
});
