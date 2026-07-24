import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/Card';
import { colors, spacing } from '@/constants/theme';
import { islamicTodayLabel, statusItems as fallbackStatusItems, StatusItem, todayLabel } from '@/data/mock';
import { fetchTodayMajlis } from '@/lib/api';

export default function StatusScreen() {
  const [items, setItems] = useState<StatusItem[]>(fallbackStatusItems);
  const completed = items.filter((item) => item.status === 'Completed').length;
  const current = items.find((item) => item.status === 'Started' || item.status === 'En Route') || items[0];

  useEffect(() => {
    fetchTodayMajlis().then(setItems);
  }, []);

  return (
    <AppShell title="Majlis Status" subtitle={`${todayLabel} / ${islamicTodayLabel}`} compact>
      <Card>
        <Text style={styles.kicker}>Current Status</Text>
        <Text style={styles.current}>
          {current ? `${current.contactName || current.title || 'Majlis'} - ${current.status}${current.stage ? ` - ${current.stage}` : ''}` : 'No Anjuman majalis listed for today'}
        </Text>
        <Text style={styles.progress}>{completed} / {items.length} majalis completed</Text>
      </Card>

      <View style={styles.stack}>
        {!items.length ? (
          <Card>
            <Text style={styles.emptyTitle}>No status board for today.</Text>
            <Text style={styles.emptyText}>When there are Anjuman schedule majalis today, they will appear here automatically.</Text>
          </Card>
        ) : null}
        {items.map((item, index) => (
          <Card key={item.id}>
            <View style={styles.statusRow}>
              <View style={styles.num}>
                <Text style={styles.numText}>{index + 1}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.time}>{item.time || 'TBA'}</Text>
                <Text style={styles.name}>{item.contactName || item.title || 'Majlis'}</Text>
                <Text style={styles.title}>{item.title || 'Program details pending'}</Text>
                {item.address ? (
                  <Pressable onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`)}>
                    <Text style={styles.address}>{item.address}</Text>
                  </Pressable>
                ) : null}
                <Text style={[styles.badge, item.status === 'Started' && styles.started]}>{item.status}</Text>
                {item.stage ? <Text style={styles.stage}>Current Stage: {item.stage}</Text> : null}
              </View>
            </View>
          </Card>
        ))}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: colors.goldDark,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  current: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  progress: {
    color: colors.muted,
    marginTop: spacing.sm,
  },
  stack: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  num: {
    alignItems: 'center',
    backgroundColor: colors.red,
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  numText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  info: {
    flex: 1,
  },
  time: {
    color: colors.goldDark,
    fontWeight: '900',
  },
  name: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 3,
  },
  title: {
    color: colors.muted,
    marginTop: 3,
  },
  address: {
    color: colors.blue,
    marginTop: spacing.xs,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.charcoal,
    borderRadius: 999,
    color: '#fff',
    fontWeight: '900',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  started: {
    backgroundColor: colors.goldDark,
  },
  stage: {
    color: colors.goldDark,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.muted,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
});
