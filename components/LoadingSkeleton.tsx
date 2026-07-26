import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

type BarProps = {
  height?: number;
  light?: boolean;
  width?: `${number}%` | number;
};

function Bar({ height = 14, light = false, width = '100%' }: BarProps) {
  return <View style={[styles.bar, light && styles.lightBar, { height, width }]} />;
}

export function HomeLoadingSkeleton() {
  return (
    <View accessibilityLabel="Loading schedule" style={styles.stack}>
      <View style={styles.hero}>
        <View style={styles.flex}>
          <Bar width={120} />
          <Bar height={54} width="76%" />
          <Bar width={180} />
          <Bar height={44} width={190} />
        </View>
        <View style={[styles.flex, styles.heroAside]}>
          <Bar width={150} />
          <Bar height={42} width="82%" />
          <Bar width="65%" />
          <Bar width="48%" />
        </View>
      </View>
      <View style={styles.homeGrid}>
        <View style={styles.scheduleSheet}>
          <View style={styles.sheetHeader}>
            <Bar light width={130} />
            <Bar height={42} light width="58%" />
            <Bar light width="70%" />
          </View>
          <EventRows count={5} />
        </View>
        <View style={styles.rail}>
          <Bar width={110} />
          <Bar height={60} width="100%" />
          <Bar width={130} />
          <Bar height={190} width="100%" />
        </View>
      </View>
    </View>
  );
}

export function ScheduleLoadingSkeleton() {
  return (
    <View accessibilityLabel="Loading events" style={styles.stack}>
      <View style={styles.pageLead}>
        <Bar width={150} />
        <Bar height={40} width="52%" />
        <Bar width="68%" />
      </View>
      <View style={styles.filterRow}>
        {[64, 82, 78, 72, 68].map((width) => <Bar key={width} height={32} width={width} />)}
      </View>
      <View style={styles.scheduleSheet}>
        <EventRows count={6} />
      </View>
    </View>
  );
}

export function CalendarLoadingSkeleton() {
  return (
    <View accessibilityLabel="Loading calendar" style={styles.stack}>
      <View style={styles.pageLead}>
        <Bar width={150} />
        <Bar height={40} width="45%" />
        <Bar width={190} />
      </View>
      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          {Array.from({ length: 7 }, (_, index) => <Bar key={index} height={12} light width={22} />)}
        </View>
        <View style={styles.calendarGrid}>
          {Array.from({ length: 35 }, (_, index) => (
            <View key={index} style={styles.calendarCell}>
              <Bar height={18} light width={20} />
              <Bar height={9} light width={38} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function StatusLoadingSkeleton() {
  return (
    <View accessibilityLabel="Loading live status" style={styles.stack}>
      <View style={styles.statusSummary}>
        <Bar width={120} />
        <Bar height={42} width="62%" />
        <Bar width="74%" />
        <Bar height={10} width="100%" />
      </View>
      {[0, 1, 2].map((index) => (
        <View key={index} style={styles.statusRow}>
          <Bar height={34} width={72} />
          <View style={styles.flex}>
            <Bar width="45%" />
            <Bar height={25} width="72%" />
            <Bar width="58%" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function PrayerLoadingSkeleton() {
  return (
    <View accessibilityLabel="Loading prayer times" style={styles.stack}>
      <View style={styles.prayerLead}>
        <View>
          <Bar width={110} />
          <View style={styles.smallSpacer} />
          <Bar height={34} width={160} />
        </View>
        <Bar height={48} width={120} />
      </View>
      <View style={styles.prayerSheet}>
        {Array.from({ length: 5 }, (_, index) => (
          <View key={index} style={styles.prayerRow}>
            <Bar height={38} light width={38} />
            <Bar light width={90} />
            <Bar height={24} light width={86} />
          </View>
        ))}
      </View>
    </View>
  );
}

function EventRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.eventRow}>
          <View style={styles.timeColumn}>
            <Bar height={28} light width={72} />
            <Bar light width={68} />
          </View>
          <View style={styles.flex}>
            <Bar light width={150} />
            <Bar height={27} light width="56%" />
            <Bar light width="76%" />
            <Bar light width="48%" />
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.xl,
  },
  bar: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xs,
  },
  lightBar: {
    backgroundColor: colors.ivoryMuted,
  },
  flex: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
  },
  hero: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
    minHeight: 285,
    paddingVertical: spacing.xl,
  },
  heroAside: {
    borderLeftColor: colors.border,
    borderLeftWidth: 2,
    flexBasis: 360,
    paddingLeft: spacing.lg,
  },
  homeGrid: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  scheduleSheet: {
    backgroundColor: colors.ivory,
    borderRadius: radii.md,
    flex: 3,
    minWidth: 280,
    overflow: 'hidden',
  },
  sheetHeader: {
    gap: spacing.sm,
    padding: spacing.xl,
  },
  rail: {
    flex: 1,
    flexBasis: 250,
    gap: spacing.md,
    padding: spacing.lg,
  },
  eventRow: {
    borderTopColor: colors.onIvoryLine,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    minHeight: 150,
    padding: spacing.lg,
  },
  timeColumn: {
    gap: spacing.sm,
    width: 86,
  },
  pageLead: {
    gap: spacing.sm,
    minHeight: 110,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  calendar: {
    backgroundColor: colors.ivory,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  calendarHeader: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-around',
    minHeight: 48,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    borderColor: colors.onIvoryLine,
    borderRightWidth: 1,
    borderTopWidth: 1,
    gap: spacing.sm,
    minHeight: 88,
    padding: spacing.sm,
    width: '14.2857%',
  },
  statusSummary: {
    borderLeftColor: colors.gold,
    borderLeftWidth: 2,
    gap: spacing.md,
    minHeight: 210,
    padding: spacing.lg,
  },
  statusRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    minHeight: 130,
    paddingVertical: spacing.lg,
  },
  prayerLead: {
    alignItems: 'center',
    borderLeftColor: colors.gold,
    borderLeftWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 120,
    padding: spacing.lg,
  },
  smallSpacer: {
    height: spacing.sm,
  },
  prayerSheet: {
    backgroundColor: colors.ivory,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  prayerRow: {
    alignItems: 'center',
    borderBottomColor: colors.onIvoryLine,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    minHeight: 76,
    paddingHorizontal: spacing.lg,
  },
});
