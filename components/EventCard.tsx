import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { colors, spacing } from '@/constants/theme';
import { CommunityEvent } from '@/data/mock';

type EventCardProps = {
  event: CommunityEvent;
  showScheduleMark?: boolean;
};

export function EventCard({ event, showScheduleMark = true }: EventCardProps) {
  const openMaps = () => {
    if (!event.address) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`);
  };
  const dateLabel = event.islamicDate || event.date;
  const title = event.title || 'Majlis';

  return (
    <Card>
      <View style={styles.topRow}>
        <View style={styles.datePill}>
          <Text style={styles.dateTime}>{event.time || 'TBA'}</Text>
          <Text style={styles.dateText}>{dateLabel || 'Date pending'}</Text>
        </View>
        {showScheduleMark && event.isAnjumanSchedule ? <Text style={styles.mark}>Anjuman Schedule</Text> : null}
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.contact}>{event.contactName || title}</Text>
      <Text style={styles.meta}>{event.locationName || 'Location pending'}</Text>
      {event.address ? (
        <Pressable onPress={openMaps}>
          <Text style={styles.address}>{event.address}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  datePill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dateTime: {
    color: colors.red,
    fontSize: 15,
    fontWeight: '900',
  },
  dateText: {
    color: colors.muted,
    fontSize: 12,
  },
  mark: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  contact: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  meta: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  address: {
    color: colors.blue,
    fontSize: 15,
    marginTop: spacing.sm,
  },
});
