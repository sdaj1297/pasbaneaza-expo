import { Link } from 'expo-router';
import { ArrowUpRight, MapPin, Plus } from 'lucide-react-native';
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';
import { CommunityEvent } from '@/data/mock';
import { useResponsiveWidth } from '@/hooks/useResponsiveWidth';
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
  const width = useResponsiveWidth();
  const compact = width < 680;

  return (
    <View style={styles.board}>
      <View style={styles.boardHead}>
        <View style={styles.boardTitleRow}>
          <View style={styles.boardTitleCopy}>
            <Text style={styles.kicker}>Houston schedule</Text>
            <Text style={styles.heading}>Upcoming majalis</Text>
            <Text style={styles.boardDescription}>
              Committed Anjuman programs and approved community listings.
            </Text>
          </View>
          <Link href="/connect?intent=event" asChild>
            <Pressable style={styles.submitButton}>
              <Plus color={colors.ivory} size={17} strokeWidth={2.3} />
              <Text style={styles.submitButtonText}>Submit event</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.filters}>
          {(Object.keys(filterLabels) as HomeScheduleFilter[]).map((filter) => {
            const active = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => onFilterChange(filter)}
                style={[styles.filter, active && styles.activeFilter]}
              >
                <Text style={[styles.filterText, active && styles.activeFilterText]}>
                  {filterLabels[filter]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.list}>
        {events.slice(0, 8).map((event, index) => (
          <ScheduleRow
            key={event.id}
            compact={compact}
            event={event}
            isLast={index === Math.min(events.length, 8) - 1}
          />
        ))}
        {events.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No programs in this view</Text>
            <Text style={styles.emptyText}>Choose another audience or check the full calendar.</Text>
          </View>
        ) : null}
      </View>

      <Link href="/events" asChild>
        <Pressable style={styles.fullScheduleLink}>
          <Text style={styles.fullScheduleText}>View the complete schedule</Text>
          <ArrowUpRight color={colors.onIvory} size={18} strokeWidth={2} />
        </Pressable>
      </Link>
    </View>
  );
}

function ScheduleRow({
  event,
  compact,
  isLast,
}: {
  event: CommunityEvent;
  compact: boolean;
  isLast: boolean;
}) {
  const tone = getEventTone(event);
  const openMaps = () => {
    if (!event.address) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`);
  };

  return (
    <View style={[styles.row, compact && styles.compactRow, isLast && styles.lastRow]}>
      <View style={[styles.timeColumn, compact && styles.compactTimeColumn]}>
        <Text style={styles.time}>{event.time || 'TBA'}</Text>
        <Text style={styles.date}>{event.islamicDate || event.date}</Text>
      </View>

      <View style={styles.eventColumn}>
        <View style={styles.identityRow}>
          <View style={[styles.toneMark, styles[`${tone}ToneMark`]]} />
          <Text style={[styles.toneLabel, styles[`${tone}ToneLabel`]]}>
            {getEventToneLabel(event)}
          </Text>
          <Text style={styles.audience}>{getEventAudienceLabel(event)}</Text>
        </View>
        <Text style={styles.contact}>{event.contactName || event.title}</Text>
        <Text style={styles.title}>{event.title}</Text>
        <View style={styles.locationRow}>
          <MapPin color={colors.onIvoryMuted} size={15} strokeWidth={1.8} />
          <Text style={styles.location}>{event.locationName || event.address || 'Location to be announced'}</Text>
        </View>
        {compact && event.address ? (
          <Pressable onPress={openMaps} style={styles.mobileMapLink}>
            <Text style={styles.mapText}>Open map</Text>
            <ArrowUpRight color={colors.oxblood} size={16} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>

      {event.isAnjumanSchedule ? (
        <View style={styles.committedSeal}>
          <Image
            source={require('@/assets/images/pasban-logo-ui-black.png')}
            style={styles.sealLogo}
            resizeMode="contain"
          />
        </View>
      ) : null}

      {!compact ? (
        <Pressable disabled={!event.address} onPress={openMaps} style={styles.mapLink}>
          <ArrowUpRight
            color={event.address ? colors.oxblood : colors.onIvoryLine}
            size={20}
            strokeWidth={2}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    ...shadows.medium,
    backgroundColor: colors.ivory,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  boardHead: {
    borderBottomColor: colors.onIvoryLine,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  boardTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  boardTitleCopy: {
    flex: 1,
    minWidth: 220,
  },
  kicker: {
    color: colors.oxblood,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heading: {
    color: colors.onIvory,
    fontFamily: fonts.displayMedium,
    fontSize: typography.display,
    lineHeight: 42,
    marginTop: spacing.xs,
  },
  boardDescription: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.body,
    fontSize: typography.small,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.oxblood,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  submitButtonText: {
    color: colors.ivory,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  filter: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    minHeight: 42,
    justifyContent: 'center',
  },
  activeFilter: {
    borderBottomColor: colors.oxblood,
  },
  filterText: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.small,
  },
  activeFilterText: {
    color: colors.onIvory,
    fontFamily: fonts.bodyBold,
  },
  list: {
    backgroundColor: colors.ivory,
  },
  row: {
    alignItems: 'flex-start',
    borderBottomColor: colors.onIvoryLine,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    minHeight: 150,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    position: 'relative',
  },
  compactRow: {
    flexWrap: 'wrap',
    gap: spacing.sm,
    minHeight: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  timeColumn: {
    gap: spacing.xs,
    width: 112,
  },
  compactTimeColumn: {
    width: 88,
  },
  time: {
    color: colors.onIvory,
    fontFamily: fonts.displaySemibold,
    fontSize: 24,
    lineHeight: 28,
  },
  date: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.small,
    lineHeight: 18,
  },
  eventColumn: {
    flex: 1,
    minWidth: 180,
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  toneMark: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  committedToneMark: {
    backgroundColor: colors.goldDark,
  },
  sistersToneMark: {
    backgroundColor: colors.blue,
  },
  communityToneMark: {
    backgroundColor: colors.green,
  },
  toneLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
  },
  committedToneLabel: {
    color: colors.goldDark,
  },
  sistersToneLabel: {
    color: '#397994',
  },
  communityToneLabel: {
    color: '#3e7659',
  },
  audience: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.overline,
  },
  contact: {
    color: colors.onIvory,
    fontFamily: fonts.displaySemibold,
    fontSize: 26,
    lineHeight: 30,
    marginTop: spacing.xs,
  },
  title: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: 2,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  location: {
    color: colors.onIvoryMuted,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: typography.small,
  },
  committedSeal: {
    alignItems: 'center',
    borderColor: colors.gold,
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44,
  },
  sealLogo: {
    height: 34,
    width: 34,
  },
  mapLink: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  mobileMapLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    minHeight: 32,
  },
  mapText: {
    color: colors.oxblood,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
  },
  empty: {
    alignItems: 'flex-start',
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.onIvory,
    fontFamily: fonts.displayMedium,
    fontSize: typography.title,
  },
  emptyText: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.body,
    fontSize: typography.body,
    marginTop: spacing.xs,
  },
  fullScheduleLink: {
    alignItems: 'center',
    backgroundColor: colors.ivoryRaised,
    borderTopColor: colors.onIvoryLine,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: spacing.lg,
  },
  fullScheduleText: {
    color: colors.onIvory,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
  },
});
