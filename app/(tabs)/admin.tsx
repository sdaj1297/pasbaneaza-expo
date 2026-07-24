import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/Card';
import { colors, spacing } from '@/constants/theme';
import { MajlisStatus, StatusItem, statusItems } from '@/data/mock';
import { fetchIslamicCalendarYears, fetchTodayMajlis, updateIslamicMonthLength, updateMajlisStatus } from '@/lib/api';
import { getHoustonDate, IslamicCalendarYear } from '@/lib/calendarUtils';

const statuses: MajlisStatus[] = ['Pending', 'En Route', 'Started', 'Completed', 'Delayed', 'Skipped'];

export default function AdminScreen() {
  const [items, setItems] = useState<StatusItem[]>(statusItems);
  const [calendarYears, setCalendarYears] = useState<IslamicCalendarYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [calendarNotice, setCalendarNotice] = useState('');

  useEffect(() => {
    fetchTodayMajlis().then(setItems);
    fetchIslamicCalendarYears().then((years) => {
      const sorted = [...years].sort((a, b) => b.year - a.year);
      setCalendarYears(sorted);
      setSelectedYear((current) => current || sorted.find((year) => year.firstDate <= getHoustonDate())?.year || sorted[0]?.year || null);
    });
  }, []);

  const activeCalendarYear = useMemo(
    () => calendarYears.find((year) => year.year === selectedYear) || calendarYears[0],
    [calendarYears, selectedYear],
  );

  const setStatus = async (item: StatusItem, status: MajlisStatus) => {
    const stage = status === 'Started' ? item.stage || 'Hadis e Kisa' : undefined;
    setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, status, stage } : currentItem));
    const updatedItems = await updateMajlisStatus(item.id, item.date, status, stage);
    setItems(updatedItems);
  };

  const setMonthLength = async (year: IslamicCalendarYear, monthIndex: number, length: 29 | 30) => {
    setCalendarNotice('');
    setCalendarYears((current) => current.map((item) => item.year === year.year ? {
      ...item,
      months: item.months.map((month) => month.index === monthIndex ? { ...month, length } : month),
    } : item));

    try {
      const updatedYear = await updateIslamicMonthLength(year.year, monthIndex, length);
      setCalendarYears((current) => current.map((item) => item.year === updatedYear.year ? updatedYear : item));
      setCalendarNotice(`Updated ${updatedYear.year} ${updatedYear.months.find((month) => month.index === monthIndex)?.name || 'month'} to ${length} days.`);
    } catch {
      setCalendarNotice('Unable to update the month length. Please try again.');
      fetchIslamicCalendarYears().then(setCalendarYears);
    }
  };

  return (
    <AppShell title="Status Admin" subtitle="Prototype local controls" compact>
      <View style={styles.stack}>
        <Card>
          <Text style={styles.sectionTitle}>Majlis Status</Text>
          <Text style={styles.sectionMeta}>Open community controls for today's Anjuman schedule.</Text>
        </Card>

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

        <Card>
          <Text style={styles.sectionTitle}>Islamic Month Lengths</Text>
          <Text style={styles.sectionMeta}>Adjust the official Pasban calendar after moonsighting. Each month must be 29 or 30 days.</Text>

          <View style={styles.yearRow}>
            {calendarYears.slice(0, 6).map((year) => (
              <Pressable
                key={year.year}
                onPress={() => setSelectedYear(year.year)}
                style={selectedYear === year.year ? styles.activeYearButton : styles.yearButton}
              >
                <Text style={selectedYear === year.year ? styles.activeYearText : styles.yearText}>{year.year}</Text>
              </Pressable>
            ))}
          </View>

          {activeCalendarYear ? (
            <View style={styles.monthStack}>
              <Text style={styles.meta}>Lunar year starts {activeCalendarYear.firstDate}</Text>
              {activeCalendarYear.months.map((month) => (
                <View key={month.key} style={styles.monthRow}>
                  <View style={styles.monthNameBlock}>
                    <Text style={styles.monthName}>{month.name}</Text>
                    <Text style={styles.monthMeta}>Month {month.index}</Text>
                  </View>
                  <View style={styles.lengthButtons}>
                    {[29, 30].map((length) => (
                      <Pressable
                        key={length}
                        onPress={() => setMonthLength(activeCalendarYear, month.index, length as 29 | 30)}
                        style={month.length === length ? styles.activeLengthButton : styles.lengthButton}
                      >
                        <Text style={month.length === length ? styles.activeLengthText : styles.lengthText}>{length}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.meta}>Islamic calendar data has not loaded yet.</Text>
          )}

          {calendarNotice ? <Text style={styles.calendarNotice}>{calendarNotice}</Text> : null}
        </Card>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  sectionMeta: {
    color: colors.muted,
    lineHeight: 21,
    marginTop: spacing.xs,
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
  yearRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  yearButton: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  activeYearButton: {
    backgroundColor: colors.red,
    borderColor: colors.red,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  yearText: {
    color: colors.ink,
    fontWeight: '900',
  },
  activeYearText: {
    color: '#fff',
    fontWeight: '900',
  },
  monthStack: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  monthRow: {
    alignItems: 'center',
    borderColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  monthNameBlock: {
    flex: 1,
    minWidth: 160,
  },
  monthName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  monthMeta: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  lengthButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  lengthButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    width: 52,
  },
  activeLengthButton: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    width: 52,
  },
  lengthText: {
    color: colors.ink,
    fontWeight: '900',
  },
  activeLengthText: {
    color: colors.night,
    fontWeight: '900',
  },
  calendarNotice: {
    color: colors.gold,
    fontWeight: '800',
    marginTop: spacing.md,
  },
});
