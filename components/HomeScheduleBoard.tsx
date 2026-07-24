import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { CommunityEvent } from '@/data/mock';

export type HomeScheduleFilter = 'all' | 'anjuman' | 'brothers' | 'sisters' | 'family';

const filterLabels: Record<HomeScheduleFilter, string> = {
  all: 'All',
  anjuman: 'Anjuman',
  brothers: 'Brothers',
  sisters: 'Sisters',
  family: 'Family',
};

const audienceLabel: Record<string, string> = {
  M: 'Brothers',
  W: 'Sisters',
  F: 'Family',
  A: 'All',
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
        <Text style={styles.kicker}>Schedule</Text>
        <Text style={styles.heading}>Programs coming up in Houston</Text>
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
  const openMaps = () => {
    if (!event.address) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`);
  };

  return (
    <View style={styles.row}>
      <View style={styles.timeColumn}>
        <Text style={styles.time}>{event.time || 'TBA'}</Text>
        <Text style={styles.date}>{event.islamicDate || event.date}</Text>
      </View>

      <View style={styles.eventColumn}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, event.isAnjumanSchedule ? styles.anjumanBadge : styles.communityBadge]}>
            <Text style={[styles.badgeText, event.isAnjumanSchedule ? styles.anjumanBadgeText : styles.communityBadgeText]}>
              {event.isAnjumanSchedule ? 'Anjuman committed' : 'Community'}
            </Text>
          </View>
          <Text style={styles.audience}>{audienceLabel[event.type] || 'Program'}</Text>
        </View>

        <Text style={styles.contact}>{event.contactName || event.title}</Text>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.location}>{event.locationName || event.address || 'Location TBA'}</Text>

        <View style={styles.actions}>
          <Pressable onPress={openMaps} disabled={!event.address} style={styles.textButton}>
            <Text style={[styles.textButtonLabel, !event.address && styles.disabledText]}>Map</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: colors.nightCard,
    borderColor: colors.nightLine,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  boardHead: {
    backgroundColor: colors.oxblood,
    padding: spacing.lg,
  },
  kicker: {
    color: colors.gold,
    fontSize: typography.label,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heading: {
    color: colors.text,
    fontSize: typography.display,
    fontWeight: '900',
    lineHeight: 39,
    marginTop: spacing.sm,
    maxWidth: 620,
  },
  filters: {
    borderBottomColor: colors.nightLine,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
  },
  filter: {
    borderColor: colors.nightLine,
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
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  activeFilterText: {
    color: colors.text,
  },
  list: {
    backgroundColor: colors.nightCard,
  },
  row: {
    borderBottomColor: colors.nightLine,
    borderBottomWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  timeColumn: {
    gap: spacing.xs,
  },
  time: {
    color: colors.gold,
    fontSize: typography.title,
    fontWeight: '900',
  },
  date: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  eventColumn: {
    gap: spacing.xs,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  anjumanBadge: {
    backgroundColor: 'rgba(217, 173, 67, .18)',
  },
  communityBadge: {
    borderColor: colors.nightLine,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: typography.label,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  anjumanBadgeText: {
    color: colors.gold,
  },
  communityBadgeText: {
    color: colors.textMuted,
  },
  audience: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  contact: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '900',
    lineHeight: 30,
    marginTop: spacing.xs,
  },
  title: {
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: '700',
    lineHeight: 22,
  },
  location: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  textButton: {
    minHeight: 36,
    justifyContent: 'center',
  },
  textButtonLabel: {
    color: colors.gold,
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
    color: colors.text,
    fontSize: typography.lead,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.body,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
