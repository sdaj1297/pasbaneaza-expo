import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { ChevronDown, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/AppShell';
import { EventCard } from '@/components/EventCard';
import { ScheduleLoadingSkeleton } from '@/components/LoadingSkeleton';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';
import { CommunityEvent } from '@/data/mock';
import { fetchEvents, peekEvents } from '@/lib/api';
import { AuthUser, subscribeToAuthState } from '@/lib/auth';

const filters = ['All', 'Anjuman', 'Brothers', 'Sisters', 'Family'] as const;
const EVENTS_PER_PAGE = 12;
type Filter = (typeof filters)[number];

export default function EventsScreen() {
  const [filter, setFilter] = useState<Filter>('All');
  const [filtered, setFiltered] = useState<CommunityEvent[] | null>(
    () => peekEvents('all') ?? null,
  );
  const [visibleCount, setVisibleCount] = useState(EVENTS_PER_PAGE);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => subscribeToAuthState(setAuthUser), []);

  useEffect(() => {
    let active = true;
    setVisibleCount(EVENTS_PER_PAGE);
    setFiltered(peekEvents(filter.toLowerCase()) ?? null);
    fetchEvents(filter.toLowerCase()).then((nextEvents) => {
      if (active) setFiltered(nextEvents);
    });
    return () => {
      active = false;
    };
  }, [filter]);

  const visibleEvents = filtered?.slice(0, visibleCount) ?? [];
  const hasMoreEvents = Boolean(filtered && visibleCount < filtered.length);

  return (
    <AppShell title="Schedule" subtitle="Committed Anjuman programs and approved community majalis">
      {filtered === null ? (
        <ScheduleLoadingSkeleton />
      ) : (
        <>
      <View style={styles.scheduleHeader}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>Houston community calendar</Text>
          <Text style={styles.headerTitle}>Find the next majlis</Text>
          <Text style={styles.headerText}>
            Browse approved listings or add a program for the Pasban team to review.
          </Text>
        </View>
        <Link href="/connect?intent=event" asChild>
          <Pressable style={styles.submitButton}>
            <Plus color={colors.onIvory} size={18} strokeWidth={2.2} />
            <Text style={styles.submitText}>Add Event</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.filters}>
        {filters.map((item) => {
          const active = filter === item;
          return (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={[styles.filter, active && styles.activeFilter]}
            >
              <Text style={[styles.filterText, active && styles.activeFilterText]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.scheduleSheet}>
        {visibleEvents.map((event, index) => (
          <EventCard
            canEdit={Boolean(authUser?.isAdmin)}
            key={event.id}
            event={event}
            isLast={!hasMoreEvents && index === visibleEvents.length - 1}
          />
        ))}
        {hasMoreEvents ? (
          <View style={styles.loadMoreWrap}>
            <Text style={styles.loadMoreMeta}>
              Showing {visibleEvents.length} of {filtered.length} upcoming events
            </Text>
            <Pressable
              accessibilityLabel="Load more events"
              onPress={() => setVisibleCount((current) => current + EVENTS_PER_PAGE)}
              style={({ pressed }) => [styles.loadMoreButton, pressed && styles.loadMoreButtonPressed]}
            >
              <Text style={styles.loadMoreText}>Load more events</Text>
              <ChevronDown color={colors.ivory} size={18} strokeWidth={2.2} />
            </Pressable>
          </View>
        ) : null}
        {!filtered.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No events in this view</Text>
            <Text style={styles.emptyText}>Choose another audience or add a new event for review.</Text>
          </View>
        ) : null}
      </View>
        </>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scheduleHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerCopy: {
    flex: 1,
    minWidth: 250,
  },
  headerEyebrow: {
    color: colors.gold,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: 38,
    lineHeight: 42,
    marginTop: spacing.xs,
  },
  headerText: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.xs,
    maxWidth: 580,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.ivory,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  submitText: {
    color: colors.onIvory,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  filter: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    minHeight: 40,
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
  scheduleSheet: {
    ...shadows.medium,
    backgroundColor: colors.ivory,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  loadMoreWrap: {
    alignItems: 'center',
    backgroundColor: colors.ivoryRaised,
    borderTopColor: colors.onIvoryLine,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  loadMoreMeta: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.small,
    textAlign: 'center',
  },
  loadMoreButton: {
    alignItems: 'center',
    backgroundColor: colors.oxblood,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  loadMoreButtonPressed: {
    opacity: 0.82,
  },
  loadMoreText: {
    color: colors.ivory,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
  },
  empty: {
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
    lineHeight: 22,
    marginTop: spacing.xs,
  },
});
