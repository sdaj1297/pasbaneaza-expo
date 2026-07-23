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
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`);
  };
  const dateLabel = event.islamicDate || event.date;

  return (
    <Card>
      <View style={styles.topRow}>
        <View style={styles.datePill}>
          <Text style={styles.dateTime}>{event.time}</Text>
          <Text style={styles.dateText}>{dateLabel}</Text>
        </View>
        {showScheduleMark && event.isAnjumanSchedule ? <Text style={styles.mark}>Anjuman Schedule</Text> : null}
      </View>

      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.contact}>{event.contactName}</Text>
      <Text style={styles.meta}>{event.locationName}</Text>
      <Pressable onPress={openMaps}>
        <Text style={styles.address}>{event.address}</Text>
      </Pressable>
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
