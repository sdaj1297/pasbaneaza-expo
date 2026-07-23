import { StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/Card';
import { colors, spacing } from '@/constants/theme';

const days = Array.from({ length: 30 }, (_, index) => index + 1);
const highlighted = new Map([
  [1, 'Muharram begins'],
  [10, 'Ashura'],
  [13, 'Today'],
  [20, 'Arbaeen season'],
]);

export default function CalendarScreen() {
  return (
    <AppShell title="Islamic Calendar" subtitle="Muharram 1448">
      <View style={styles.grid}>
        {days.map((day) => (
          <Card key={day}>
            <View style={[styles.dayCell, highlighted.has(day) && styles.highlighted]}>
              <Text style={[styles.dayNumber, highlighted.has(day) && styles.highlightedText]}>{day}</Text>
              <Text style={[styles.dayLabel, highlighted.has(day) && styles.highlightedText]}>
                {highlighted.get(day) || 'Muharram'}
              </Text>
            </View>
          </Card>
        ))}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dayCell: {
    minHeight: 78,
    minWidth: 120,
  },
  highlighted: {
    backgroundColor: colors.red,
    borderRadius: 6,
    margin: -spacing.md,
    padding: spacing.md,
  },
  dayNumber: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '900',
  },
  dayLabel: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  highlightedText: {
    color: '#fff',
  },
});
