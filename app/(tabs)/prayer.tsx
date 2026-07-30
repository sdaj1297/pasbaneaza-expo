import { useEffect, useMemo, useState } from 'react';
import { Moon, Sun, Sunrise, Sunset } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/AppShell';
import { PrayerLoadingSkeleton } from '@/components/LoadingSkeleton';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';
import { PrayerTime } from '@/data/mock';
import { fetchPrayerTimes, peekPrayerTimes } from '@/lib/api';
import { addDays, getHoustonDate } from '@/lib/calendarUtils';
import { formatGregorianDate } from '@/lib/datePresentation';
import { getHoustonPrayerTimes } from '@/lib/prayerTimes';

export default function PrayerScreen() {
  const [times, setTimes] = useState<PrayerTime[] | null>(() => peekPrayerTimes() ?? null);
  const nextPrayer = useMemo(() => {
    const today = getHoustonDate();
    return findNextPrayer(times || [], getHoustonPrayerTimes(addDays(today, 1)));
  }, [times]);

  useEffect(() => {
    fetchPrayerTimes().then(setTimes);
  }, []);

  if (times === null) {
    return (
      <AppShell title="Prayer Times" subtitle="Houston" compact>
        <PrayerLoadingSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell title="Prayer Times" subtitle={`Houston · ${formatGregorianDate(getHoustonDate(), 'long')}`} compact>
      {nextPrayer ? (
        <View style={styles.nextPrayer}>
          <View>
            <Text style={styles.nextEyebrow}>Next prayer</Text>
            <Text style={styles.nextLabel}>
              {nextPrayer.isTomorrow ? `Tomorrow · ${nextPrayer.label}` : nextPrayer.label}
            </Text>
          </View>
          <Text style={styles.nextTime}>{nextPrayer.time}</Text>
        </View>
      ) : null}

      <View style={styles.timesSheet}>
        {times.map((item, index) => {
          const Icon = iconForPrayer(item.label);
          const active = !nextPrayer?.isTomorrow && item.label === nextPrayer?.label;
          return (
            <View
              key={item.label}
              style={[styles.row, index === times.length - 1 && styles.lastRow]}
            >
              <View style={[styles.iconWell, active && styles.activeIconWell]}>
                <Icon
                  color={active ? colors.oxblood : colors.onIvoryMuted}
                  size={21}
                  strokeWidth={1.8}
                />
              </View>
              <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
              <Text style={[styles.time, active && styles.activeTime]}>{item.time}</Text>
            </View>
          );
        })}
      </View>
    </AppShell>
  );
}

function iconForPrayer(label: string) {
  if (label === 'Fajr') return Moon;
  if (label === 'Sunrise') return Sunrise;
  if (label === 'Sunset') return Sunset;
  if (label === 'Maghrib') return Moon;
  return Sun;
}

function findNextPrayer(times: PrayerTime[], tomorrowTimes: PrayerTime[]) {
  const houstonTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const nowMinutes = houstonTime.getHours() * 60 + houstonTime.getMinutes();
  const nextToday = times.find((item) => parseTime(item.time) >= nowMinutes);
  if (nextToday) return { ...nextToday, isTomorrow: false };

  const tomorrowFajr = tomorrowTimes.find((item) => item.label === 'Fajr') || tomorrowTimes[0];
  return tomorrowFajr ? { ...tomorrowFajr, isTomorrow: true } : undefined;
}

function parseTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  if (hour === 12) hour = 0;
  if (period === 'PM') hour += 12;
  return hour * 60 + minute;
}

const styles = StyleSheet.create({
  nextPrayer: {
    alignItems: 'flex-end',
    backgroundColor: colors.oxblood,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    minHeight: 178,
    padding: spacing.xl,
  },
  nextEyebrow: {
    color: colors.goldSoft,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  nextLabel: {
    color: colors.ivory,
    fontFamily: fonts.displayMedium,
    fontSize: 42,
    lineHeight: 46,
    marginTop: spacing.sm,
  },
  nextTime: {
    color: colors.ivory,
    fontFamily: fonts.displaySemibold,
    fontSize: 44,
    lineHeight: 48,
  },
  timesSheet: {
    ...shadows.medium,
    backgroundColor: colors.ivory,
    borderRadius: radii.md,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.onIvoryLine,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 86,
    paddingHorizontal: spacing.lg,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  iconWell: {
    alignItems: 'center',
    backgroundColor: '#e9e1d6',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  activeIconWell: {
    backgroundColor: '#ecd9d8',
  },
  label: {
    color: colors.onIvoryMuted,
    flex: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.lead,
  },
  activeLabel: {
    color: colors.oxblood,
    fontFamily: fonts.bodyBold,
  },
  time: {
    color: colors.onIvory,
    fontFamily: fonts.displaySemibold,
    fontSize: 26,
  },
  activeTime: {
    color: colors.oxblood,
  },
});
