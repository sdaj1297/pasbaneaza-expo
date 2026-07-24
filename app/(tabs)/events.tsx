import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/AppShell';
import { EventCard } from '@/components/EventCard';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';
import { CommunityEvent, events as fallbackEvents } from '@/data/mock';
import { fetchEvents } from '@/lib/api';

const filters = ['All', 'Anjuman', 'Brothers', 'Sisters', 'Family'] as const;
type Filter = (typeof filters)[number];

export default function EventsScreen() {
  const [filter, setFilter] = useState<Filter>('All');
  const [filtered, setFiltered] = useState<CommunityEvent[]>(fallbackEvents);

  useEffect(() => {
    let active = true;
    fetchEvents(filter.toLowerCase()).then((nextEvents) => {
      if (active) setFiltered(nextEvents);
    });
    return () => {
      active = false;
    };
  }, [filter]);

  return (
    <AppShell title="Schedule" subtitle="Committed Anjuman programs and approved community majalis">
      <View style={styles.scheduleHeader}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>Houston community calendar</Text>
          <Text style={styles.headerTitle}>Find the next majlis</Text>
          <Text style={styles.headerText}>
            Browse approved listings or submit a program for the Pasban team to review.
          </Text>
        </View>
        <Link href="/connect?intent=event" asChild>
          <Pressable style={styles.submitButton}>
            <Plus color={colors.onIvory} size={18} strokeWidth={2.2} />
            <Text style={styles.submitText}>Submit an event</Text>
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
        {filtered.map((event, index) => (
          <EventCard key={event.id} event={event} isLast={index === filtered.length - 1} />
        ))}
        {!filtered.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No events in this view</Text>
            <Text style={styles.emptyText}>Choose another audience or submit a new event for review.</Text>
          </View>
        ) : null}
      </View>
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
