import { useEffect, useMemo, useState } from 'react';
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Download,
  MapPin,
} from 'lucide-react-native';
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppShell } from '@/components/AppShell';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';
import { CommunityEvent, events as fallbackEvents, islamicCalendarYears, islamicEvents } from '@/data/mock';
import { useResponsiveWidth } from '@/hooks/useResponsiveWidth';
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
import { formatCompactIslamicDate } from '@/lib/datePresentation';
import { getEventAudienceLabel, getEventTone, getEventToneLabel } from '@/lib/eventPresentation';

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
  const width = useResponsiveWidth();
  const compact = width < 760;
  const [selectedDate, setSelectedDate] = useState(getHoustonDate());
  const [activeDayDate, setActiveDayDate] = useState(getHoustonDate());
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [calendar, setCalendar] = useState<CalendarMonthPayload>(fallbackCalendar);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    fetchCalendarMonth(selectedDate, filter)
      .then((payload) => {
        if (!active) return;
        setCalendar(payload);
        const preferred = payload.days.find((day) => day.date === activeDayDate)
          || payload.days.find((day) => day.isToday)
          || payload.days.find((day) => day.isCurrentMonth && day.events.length)
          || payload.days.find((day) => day.isCurrentMonth);
        if (preferred) setActiveDayDate(preferred.date);
      })
      .catch(() => {
        if (!active) return;
        const payload = buildCalendarMonth({
          date: selectedDate,
          filter,
          events: fallbackEvents,
          calendarYears: islamicCalendarYears,
          islamicEvents,
        });
        setCalendar(payload);
      });

    return () => {
      active = false;
    };
  }, [filter, selectedDate]);

  const visibleEvents = useMemo(
    () => dedupeEvents(calendar.days.flatMap((day) => day.events)),
    [calendar.days],
  );
  const selectedDay = calendar.days.find((day) => day.date === activeDayDate)
    || calendar.days.find((day) => day.isCurrentMonth)
    || calendar.days[0];
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
    <AppShell title="Calendar" subtitle="The complete Houston majlis calendar">
      <View style={styles.calendarToolbar}>
        <View style={styles.monthCopy}>
          <Text style={styles.eyebrow}>Schedule calendar</Text>
          <Text style={styles.monthTitle}>{calendar.month.label}</Text>
          <Text style={styles.monthMeta}>
            {visibleEvents.length} programs · {anjumanCount} committed
          </Text>
        </View>

        <View style={styles.monthNavigation}>
          <Pressable
            accessibilityLabel="Previous month"
            onPress={() => setSelectedDate(addMonths(selectedDate, -1))}
            style={styles.iconButton}
          >
            <ChevronLeft color={colors.ink} size={20} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => setSelectedDate(getHoustonDate())}
            style={styles.todayButton}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Next month"
            onPress={() => setSelectedDate(addMonths(selectedDate, 1))}
            style={styles.iconButton}
          >
            <ChevronRight color={colors.ink} size={20} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <View style={styles.utilityRow}>
        <View style={styles.filters}>
          {filterOptions.map((option) => {
            const active = filter === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setFilter(option.value)}
                style={[styles.filter, active && styles.activeFilter]}
              >
                <Text style={[styles.filterText, active && styles.activeFilterText]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.exportActions}>
          <Pressable onPress={downloadMonth} style={styles.exportButton}>
            <Download color={colors.muted} size={17} strokeWidth={2} />
            {!compact ? <Text style={styles.exportText}>Download .ics</Text> : null}
          </Pressable>
          <Pressable onPress={syncMonth} style={styles.syncButton}>
            <CalendarPlus color={colors.onIvory} size={17} strokeWidth={2} />
            {!compact ? <Text style={styles.syncText}>Sync calendar</Text> : null}
          </Pressable>
        </View>
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <View style={styles.calendarSheet}>
        <View style={styles.weekHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={styles.weekLabel}>{compact ? day.slice(0, 1) : day}</Text>
          ))}
        </View>
        <View style={styles.monthGrid}>
          {calendar.days.map((day) => (
            <CalendarCell
              key={day.date}
              compact={compact}
              day={day}
              selected={day.date === activeDayDate}
              onSelect={() => setActiveDayDate(day.date)}
            />
          ))}
        </View>
      </View>

      {selectedDay ? <SelectedDayAgenda day={selectedDay} /> : null}
    </AppShell>
  );
}

function CalendarCell({
  day,
  compact,
  selected,
  onSelect,
}: {
  day: CalendarDay;
  compact: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.dayCell,
        compact && styles.compactDayCell,
        !day.isCurrentMonth && styles.offMonthCell,
        day.isToday && styles.todayCell,
        selected && styles.selectedCell,
      ]}
    >
      <View style={styles.dayHeader}>
        <Text style={[styles.dayNumber, !day.isCurrentMonth && styles.offMonthText]}>
          {day.dayOfMonth}
        </Text>
        {day.isToday ? <View style={styles.todayDot} /> : null}
      </View>
      <Text numberOfLines={1} style={[styles.hijriText, compact && styles.compactHijriText]}>
        {compact
          ? formatCompactIslamicDate(day.islamicDate)
          : day.islamicDate?.label || 'Hijri pending'}
      </Text>
      {day.islamicEvents.length && !compact ? (
        <Text numberOfLines={1} style={styles.observanceText}>
          {day.islamicEvents[0].title}
        </Text>
      ) : null}
      <View style={[styles.eventStack, compact && styles.compactEventStack]}>
        {compact ? (
          day.events.slice(0, 4).map((event) => (
            <View key={event.id} style={[styles.eventDot, styles[`${getEventTone(event)}Dot`]]} />
          ))
        ) : (
          day.events.slice(0, 3).map((event) => (
            <View key={event.id} style={[styles.eventChip, styles[`${getEventTone(event)}Chip`]]}>
              <Text numberOfLines={2} style={styles.eventChipText}>
                {event.time ? `${event.time} ` : ''}{event.contactName || event.title}
              </Text>
              {event.isAnjumanSchedule ? (
                <Image
                  source={require('@/assets/images/pasban-logo-ui-black.png')}
                  style={styles.eventLogo}
                  resizeMode="contain"
                />
              ) : null}
            </View>
          ))
        )}
      </View>
      {!compact && day.events.length > 3 ? (
        <Text style={styles.moreText}>+{day.events.length - 3} more</Text>
      ) : null}
    </Pressable>
  );
}

function SelectedDayAgenda({ day }: { day: CalendarDay }) {
  return (
    <View style={styles.agenda}>
      <View style={styles.agendaHeader}>
        <View>
          <Text style={styles.agendaEyebrow}>Selected day</Text>
          <Text style={styles.agendaTitle}>{day.weekday}, {day.displayDate}</Text>
          <Text style={styles.agendaHijri}>{day.islamicDate?.label || 'Hijri date pending'}</Text>
        </View>
        <Text style={styles.agendaCount}>{day.events.length} {day.events.length === 1 ? 'program' : 'programs'}</Text>
      </View>

      {day.islamicEvents.map((event) => (
        <Text key={event.id} style={styles.agendaObservance}>{event.title}</Text>
      ))}

      <View style={styles.agendaList}>
        {day.events.map((event, index) => (
          <AgendaEvent key={event.id} event={event} isLast={index === day.events.length - 1} />
        ))}
        {!day.events.length ? (
          <View style={styles.emptyAgenda}>
            <Text style={styles.emptyAgendaTitle}>No programs listed</Text>
            <Text style={styles.emptyAgendaText}>Choose another date or submit a community event for review.</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function AgendaEvent({ event, isLast }: { event: CommunityEvent; isLast: boolean }) {
  const tone = getEventTone(event);
  return (
    <View style={[styles.agendaEvent, isLast && styles.lastAgendaEvent]}>
      <View style={styles.agendaTimeBlock}>
        <Text style={styles.agendaTime}>{event.time || 'TBA'}</Text>
        <Text style={[styles.agendaTone, styles[`${tone}AgendaTone`]]}>{getEventToneLabel(event)}</Text>
      </View>
      <View style={styles.agendaEventCopy}>
        <Text style={styles.agendaHost}>{event.contactName || event.title}</Text>
        <Text style={styles.agendaProgram}>{event.title}</Text>
        <Text style={styles.agendaAudience}>{getEventAudienceLabel(event)}</Text>
      </View>
      {event.address ? (
        <Pressable
          accessibilityLabel={`Open map for ${event.contactName || event.title}`}
          onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`)}
          style={styles.mapButton}
        >
          <MapPin color={colors.gold} size={19} strokeWidth={1.9} />
        </Pressable>
      ) : null}
    </View>
  );
}

function dedupeEvents(events: CommunityEvent[]) {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

const styles = StyleSheet.create({
  calendarToolbar: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
  },
  monthCopy: {
    flex: 1,
    minWidth: 220,
  },
  eyebrow: {
    color: colors.gold,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  monthTitle: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: 40,
    lineHeight: 44,
    marginTop: spacing.xs,
  },
  monthMeta: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: typography.small,
    marginTop: spacing.xs,
  },
  monthNavigation: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  todayButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  todayButtonText: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.small,
  },
  utilityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  filter: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    minHeight: 38,
    justifyContent: 'center',
  },
  activeFilter: {
    borderBottomColor: colors.gold,
  },
  filterText: {
    color: colors.textSubtle,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.small,
  },
  activeFilterText: {
    color: colors.ink,
  },
  exportActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  exportButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  exportText: {
    color: colors.muted,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.small,
  },
  syncButton: {
    alignItems: 'center',
    backgroundColor: colors.ivory,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  syncText: {
    color: colors.onIvory,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
  },
  notice: {
    color: colors.goldSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.small,
    marginBottom: spacing.md,
  },
  calendarSheet: {
    ...shadows.medium,
    backgroundColor: colors.ivory,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  weekHeader: {
    backgroundColor: colors.onIvory,
    flexDirection: 'row',
  },
  weekLabel: {
    color: colors.ivoryMuted,
    flexBasis: '14.2857%',
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    backgroundColor: colors.ivory,
    borderBottomColor: colors.onIvoryLine,
    borderBottomWidth: 1,
    borderRightColor: colors.onIvoryLine,
    borderRightWidth: 1,
    flexBasis: '14.2857%',
    minHeight: 150,
    padding: spacing.sm,
  },
  compactDayCell: {
    minHeight: 76,
    padding: spacing.xs,
  },
  offMonthCell: {
    backgroundColor: '#e6ded2',
  },
  todayCell: {
    backgroundColor: colors.ivoryRaised,
  },
  selectedCell: {
    borderColor: colors.oxblood,
    borderWidth: 2,
  },
  dayHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayNumber: {
    color: colors.onIvory,
    fontFamily: fonts.displaySemibold,
    fontSize: typography.lead,
  },
  offMonthText: {
    color: '#9f9488',
  },
  todayDot: {
    backgroundColor: colors.oxblood,
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  hijriText: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    marginTop: 2,
  },
  compactHijriText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 9,
    lineHeight: 12,
    minHeight: 12,
  },
  observanceText: {
    color: colors.oxblood,
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    marginTop: spacing.xs,
  },
  eventStack: {
    gap: 4,
    marginTop: spacing.xs,
  },
  compactEventStack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: spacing.xs,
  },
  eventChip: {
    borderLeftWidth: 3,
    minHeight: 30,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    position: 'relative',
  },
  committedChip: {
    backgroundColor: '#eee1bf',
    borderLeftColor: colors.goldDark,
  },
  sistersChip: {
    backgroundColor: '#dbeaf0',
    borderLeftColor: '#397994',
  },
  communityChip: {
    backgroundColor: '#dce8df',
    borderLeftColor: '#3e7659',
  },
  eventChipText: {
    color: colors.onIvory,
    fontFamily: fonts.bodySemibold,
    fontSize: 9,
    lineHeight: 12,
    paddingRight: 12,
  },
  eventLogo: {
    bottom: 2,
    height: 13,
    opacity: 0.72,
    position: 'absolute',
    right: 2,
    width: 13,
  },
  eventDot: {
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  committedDot: {
    backgroundColor: colors.goldDark,
  },
  sistersDot: {
    backgroundColor: '#397994',
  },
  communityDot: {
    backgroundColor: '#3e7659',
  },
  moreText: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: 9,
    marginTop: 3,
  },
  agenda: {
    marginTop: spacing.xl,
  },
  agendaHeader: {
    alignItems: 'flex-end',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  agendaEyebrow: {
    color: colors.gold,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  agendaTitle: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: 32,
    lineHeight: 36,
    marginTop: spacing.xs,
  },
  agendaHijri: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.small,
    marginTop: 2,
  },
  agendaCount: {
    color: colors.textSubtle,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.small,
  },
  agendaObservance: {
    color: colors.red,
    fontFamily: fonts.displayMedium,
    fontSize: typography.lead,
    marginTop: spacing.md,
  },
  agendaList: {
    marginTop: spacing.sm,
  },
  agendaEvent: {
    alignItems: 'flex-start',
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    minHeight: 112,
    paddingVertical: spacing.lg,
  },
  lastAgendaEvent: {
    borderBottomWidth: 0,
  },
  agendaTimeBlock: {
    width: 128,
  },
  agendaTime: {
    color: colors.ink,
    fontFamily: fonts.displaySemibold,
    fontSize: typography.title,
  },
  agendaTone: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    lineHeight: 15,
    marginTop: spacing.xs,
  },
  committedAgendaTone: {
    color: colors.gold,
  },
  sistersAgendaTone: {
    color: colors.blue,
  },
  communityAgendaTone: {
    color: colors.greenSoft,
  },
  agendaEventCopy: {
    flex: 1,
  },
  agendaHost: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: 24,
    lineHeight: 28,
  },
  agendaProgram: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: 2,
  },
  agendaAudience: {
    color: colors.textSubtle,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.small,
    marginTop: spacing.xs,
  },
  mapButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  emptyAgenda: {
    paddingVertical: spacing.xl,
  },
  emptyAgendaTitle: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: typography.title,
  },
  emptyAgendaText: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
});
