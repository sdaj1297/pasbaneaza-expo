import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/Card';
import { EventCard } from '@/components/EventCard';
import { colors, spacing } from '@/constants/theme';
import { CommunityEvent, events as fallbackEvents } from '@/data/mock';
import { fetchEvents } from '@/lib/api';

const filters = ['All', 'Anjuman', 'Brothers', 'Sisters', 'Family'] as const;
type Filter = (typeof filters)[number];

function apiFilter(filter: Filter) {
  return filter.toLowerCase();
}

export default function EventsScreen() {
  const [filter, setFilter] = useState<Filter>('All');
  const [filtered, setFiltered] = useState<CommunityEvent[]>(fallbackEvents);

  useEffect(() => {
    let active = true;
    fetchEvents(apiFilter(filter)).then((nextEvents) => {
      if (active) setFiltered(nextEvents);
    });
    return () => {
      active = false;
    };
  }, [filter]);

  return (
    <AppShell title="Events" subtitle="Community and Anjuman schedule">
      <Card>
        <View style={styles.submitRow}>
          <View style={styles.submitCopy}>
            <Text style={styles.submitTitle}>Have a majlis or community program to list?</Text>
            <Text style={styles.submitText}>Submit the details publicly. New events stay pending review until the Pasban team approves them.</Text>
          </View>
          <Link href="/connect?intent=event" asChild>
            <Pressable style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>Submit New Event</Text>
            </Pressable>
          </Link>
        </View>
      </Card>

      <View style={styles.filters}>
        {filters.map((item) => (
          <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.activeFilter]}>
            <Text style={[styles.filterText, filter === item && styles.activeFilterText]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.stack}>
        {!filtered.length ? (
          <Card>
            <Text style={styles.emptyTitle}>No events found for this filter.</Text>
            <Text style={styles.emptyText}>Try another filter or submit a new event for review.</Text>
          </Card>
        ) : null}
        {filtered.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  submitRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  submitCopy: {
    flex: 1,
    minWidth: 260,
  },
  submitTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  submitText: {
    color: colors.muted,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  ctaButton: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ctaButtonText: {
    color: colors.night,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  filter: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  activeFilter: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  filterText: {
    color: colors.ink,
    fontWeight: '800',
  },
  activeFilterText: {
    color: '#fff',
  },
  stack: {
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.muted,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
});
