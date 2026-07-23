import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/Card';
import { colors, spacing } from '@/constants/theme';
import { prayerTimes as fallbackPrayerTimes, PrayerTime, todayLabel } from '@/data/mock';
import { fetchPrayerTimes } from '@/lib/api';

export default function PrayerScreen() {
  const [times, setTimes] = useState<PrayerTime[]>(fallbackPrayerTimes);

  useEffect(() => {
    fetchPrayerTimes().then(setTimes);
  }, []);

  return (
    <AppShell title="Prayer Times" subtitle={`Houston - ${todayLabel}`} compact>
      <View style={styles.stack}>
        {times.map((item) => (
          <Card key={item.label}>
            <View style={styles.row}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </View>
          </Card>
        ))}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  time: {
    color: colors.red,
    fontSize: 22,
    fontWeight: '900',
  },
});
