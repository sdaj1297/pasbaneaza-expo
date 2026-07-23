import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/Card';
import { colors, spacing } from '@/constants/theme';
import { MajlisStatus, StatusItem, statusItems } from '@/data/mock';
import { fetchTodayMajlis, updateMajlisStatus } from '@/lib/api';

const statuses: MajlisStatus[] = ['Pending', 'En Route', 'Started', 'Completed', 'Delayed', 'Skipped'];

export default function AdminScreen() {
  const [items, setItems] = useState<StatusItem[]>(statusItems);

  useEffect(() => {
    fetchTodayMajlis().then(setItems);
  }, []);

  const setStatus = async (item: StatusItem, status: MajlisStatus) => {
    const stage = status === 'Started' ? item.stage || 'Hadis e Kisa' : undefined;
    setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, status, stage } : currentItem));
    const updatedItems = await updateMajlisStatus(item.id, item.date, status, stage);
    setItems(updatedItems);
  };

  return (
    <AppShell title="Status Admin" subtitle="Prototype local controls" compact>
      <View style={styles.stack}>
        {items.map((item) => (
          <Card key={item.id}>
            <Text style={styles.name}>{item.contactName}</Text>
            <Text style={styles.meta}>{item.time} - {item.title}</Text>
            <View style={styles.buttons}>
              {statuses.map((status) => (
                <Pressable key={status} onPress={() => setStatus(item, status)} style={[styles.button, item.status === status && styles.activeButton]}>
                  <Text style={[styles.buttonText, item.status === status && styles.activeButtonText]}>{status}</Text>
                </Pressable>
              ))}
            </View>
            {item.stage ? <Text style={styles.stage}>Stage: {item.stage}</Text> : null}
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
  name: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  button: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  activeButton: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  buttonText: {
    color: colors.ink,
    fontWeight: '800',
  },
  activeButtonText: {
    color: '#fff',
  },
  stage: {
    color: colors.goldDark,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
});
