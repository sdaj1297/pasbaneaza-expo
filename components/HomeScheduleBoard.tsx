import { Link } from 'expo-router';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { CommunityEvent } from '@/data/mock';
import { getEventAudienceLabel, getEventTone, getEventToneLabel } from '@/lib/eventPresentation';

export type HomeScheduleFilter = 'all' | 'anjuman' | 'brothers' | 'sisters' | 'family';

const filterLabels: Record<HomeScheduleFilter, string> = {
  all: 'All',
  anjuman: 'Anjuman',
  brothers: 'Brothers',
  sisters: 'Sisters',
  family: 'Family',
};

type HomeScheduleBoardProps = {
  activeFilter: HomeScheduleFilter;
  events: CommunityEvent[];
  onFilterChange: (filter: HomeScheduleFilter) => void;
};

export function HomeScheduleBoard({ activeFilter, events, onFilterChange }: HomeScheduleBoardProps) {
  return (
    <View style={styles.board}>
      <View style={styles.boardHead}>
        <View style={styles.boardHeadRow}>
          <View style={styles.boardHeadCopy}>
            <Text style={styles.kicker}>Schedule</Text>
            <Text style={styles.heading}>Programs coming up in Houston</Text>
          </View>
          <Link href="/connect?intent=event" asChild>
            <Pressable style={styles.submitButton}>
              <Text style={styles.submitButtonText}>Submit Event</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <View style={styles.filters}>
        {(Object.keys(filterLabels) as HomeScheduleFilter[]).map((filter) => {
          const active = activeFilter === filter;
          return (
            <Pressable
              key={filter}
              onPress={() => onFilterChange(filter)}
              style={[styles.filter, active && styles.activeFilter]}>
              <Text style={[styles.filterText, active && styles.activeFilterText]}>{filterLabels[filter]}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.list}>
        {events.slice(0, 8).map((event) => (
          <ScheduleRow key={event.id} event={event} />
        ))}
        {events.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No programs listed for this view.</Text>
            <Text style={styles.emptyText}>Try another filter or check the full calendar.</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ScheduleRow({ event }: { event: CommunityEvent }) {
  const tone = getEventTone(event);
  const toneLabel = getEventToneLabel(event);
  const openMaps = () => {
    if (!event.address) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`);
  };

  return (
    <View style={[styles.row, styles[`${tone}Row`]]}>
      <View style={styles.timeColumn}>
        <Text style={[styles.time, styles[`${tone}Time`]]}>{event.time || 'TBA'}</Text>
        <Text style={styles.date}>{event.islamicDate || event.date}</Text>
      </View>

      <View style={styles.eventColumn}>
        <View style={styles.badgeRow}>
          {event.isAnjumanSchedule ? (
            <View style={styles.logoBadge}>
              <Image source={require('@/assets/images/pasban-logo-white.png')} style={styles.logo} resizeMode="contain" />
            </View>
          ) : null}
          <View style={[styles.badge, styles[`${tone}Badge`]]}>
            <Text style={[styles.badgeText, styles[`${tone}BadgeText`]]}>{toneLabel}</Text>
          </View>
          <Text style={styles.audience}>{getEventAudienceLabel(event)}</Text>
        </View>

        <Text style={styles.contact}>{event.contactName || event.title}</Text>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.location}>{event.locationName || event.address || 'Location TBA'}</Text>

        <View style={styles.actions}>
          <Pressable onPress={openMaps} disabled={!event.address} style={styles.textButton}>
            <Text style={[styles.textButtonLabel, !event.address && styles.disabledText]}>Maps</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  boardHead: {
    backgroundColor: colors.oxblood,
    padding: spacing.lg,
  },
  boardHeadRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  boardHeadCopy: {
    flex: 1,
    minWidth: 260,
  },
  kicker: {
    color: colors.gold,
    fontSize: typography.label,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heading: {
    color: colors.ivory,
    fontSize: typography.display,
    fontWeight: '900',
    lineHeight: 39,
    marginTop: spacing.sm,
    maxWidth: 620,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  submitButtonText: {
    color: colors.night,
    fontSize: typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  filters: {
    backgroundColor: colors.surfaceAlt,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
  },
  filter: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  activeFilter: {
    backgroundColor: colors.oxblood,
    borderColor: colors.gold,
  },
  filterText: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  activeFilterText: {
    color: colors.ivory,
  },
  list: {
    backgroundColor: colors.surface,
  },
  row: {
    alignItems: 'flex-start',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderLeftWidth: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.lg,
  },
  committedRow: {
    backgroundColor: colors.committedBg,
    borderLeftColor: colors.committedBorder,
  },
  sistersRow: {
    backgroundColor: colors.sistersBg,
    borderLeftColor: colors.sistersBorder,
  },
  communityRow: {
    backgroundColor: colors.communityBg,
    borderLeftColor: colors.communityBorder,
  },
  timeColumn: {
    gap: spacing.xs,
    width: 118,
  },
  time: {
    color: colors.red,
    fontSize: typography.title,
    fontWeight: '900',
  },
  committedTime: {
    color: colors.gold,
  },
  sistersTime: {
    color: colors.blue,
  },
  communityTime: {
    color: '#75d39b',
  },
  date: {
    color: colors.muted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  eventColumn: {
    flexBasis: 260,
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  logoBadge: {
    alignItems: 'center',
    backgroundColor: colors.night,
    borderColor: 'rgba(212, 168, 60, .55)',
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  logo: {
    height: 24,
    width: 24,
  },
  committedBadge: {
    backgroundColor: 'rgba(217, 173, 67, .18)',
    borderColor: colors.gold,
  },
  sistersBadge: {
    backgroundColor: 'rgba(117, 183, 230, .14)',
    borderColor: colors.blue,
  },
  communityBadge: {
    backgroundColor: 'rgba(47, 107, 77, .24)',
    borderColor: colors.communityBorder,
  },
  badgeText: {
    fontSize: typography.label,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  committedBadgeText: {
    color: colors.gold,
  },
  sistersBadgeText: {
    color: colors.blue,
  },
  communityBadgeText: {
    color: '#75d39b',
  },
  audience: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  contact: {
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: '900',
    lineHeight: 30,
    marginTop: spacing.xs,
  },
  title: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: '700',
    lineHeight: 22,
  },
  location: {
    color: colors.ink,
    fontSize: typography.body,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
    justifyContent: 'flex-end',
  },
  textButton: {
    minHeight: 36,
    justifyContent: 'center',
  },
  textButtonLabel: {
    color: colors.red,
    fontSize: typography.body,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  disabledText: {
    color: colors.textSubtle,
  },
  empty: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: typography.lead,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.muted,
    fontSize: typography.body,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
