import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/AppShell';
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
      <View style={styles.filters}>
        {filters.map((item) => (
          <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.activeFilter]}>
            <Text style={[styles.filterText, filter === item && styles.activeFilterText]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.stack}>
        {filtered.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
});
