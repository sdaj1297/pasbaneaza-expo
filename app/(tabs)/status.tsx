import { useEffect, useState } from 'react';
import {
  Check,
  Clock3,
  MapPin,
  Navigation,
  Radio,
  TriangleAlert,
} from 'lucide-react-native';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/AppShell';
import { colors, fonts, radii, spacing, typography } from '@/constants/theme';
import {
  islamicTodayLabel,
  MajlisStatus,
  statusItems as fallbackStatusItems,
  StatusItem,
  todayLabel,
} from '@/data/mock';
import { fetchTodayMajlis } from '@/lib/api';

export default function StatusScreen() {
  const [items, setItems] = useState<StatusItem[]>(fallbackStatusItems);
  const completed = items.filter((item) => item.status === 'Completed').length;
  const current = items.find((item) => item.status === 'Started' || item.status === 'En Route');
  const next = items.find((item) => item.status === 'Pending' || item.status === 'Delayed');
  const percent = items.length ? Math.round((completed / items.length) * 100) : 0;

  useEffect(() => {
    fetchTodayMajlis().then(setItems);
  }, []);

  return (
    <AppShell title="Live Majlis Status" subtitle={`${todayLabel} · ${islamicTodayLabel}`} compact>
      <View style={styles.liveSummary}>
        <View style={styles.liveHeading}>
          <View style={styles.liveLabelRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>Live route</Text>
          </View>
          <Text style={styles.progressText}>{completed} of {items.length} completed</Text>
        </View>

        {current ? (
          <View style={styles.currentGrid}>
            <View style={styles.currentCopy}>
              <Text style={styles.currentEyebrow}>
                {current.status === 'En Route' ? 'Anjuman is en route to' : 'Currently at'}
              </Text>
              <Text style={styles.currentName}>{current.contactName || current.title}</Text>
              <Text style={styles.currentProgram}>{current.title}</Text>
            </View>
            <View style={styles.stageBlock}>
              <Text style={styles.stageLabel}>Current stage</Text>
              <Text style={styles.stageValue}>{current.stage || current.status}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.currentGrid}>
            <View style={styles.currentCopy}>
              <Text style={styles.currentEyebrow}>{items.length ? 'Route has not started' : 'No route today'}</Text>
              <Text style={styles.currentName}>
                {next ? `${next.time || 'TBA'} · ${next.contactName || next.title}` : 'No committed majalis listed'}
              </Text>
              <Text style={styles.currentProgram}>
                {next ? 'The status board will update when the Anjuman departs.' : 'Check the calendar for upcoming programs.'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>
      </View>

      <View style={styles.routeHeading}>
        <Text style={styles.routeEyebrow}>Today’s route</Text>
        <Text style={styles.routeTitle}>{items.length ? `${items.length} scheduled stops` : 'No scheduled stops'}</Text>
      </View>

      <View style={styles.timeline}>
        {items.map((item, index) => (
          <TimelineItem
            key={item.id}
            item={item}
            index={index}
            isLast={index === items.length - 1}
          />
        ))}
        {!items.length ? (
          <View style={styles.emptyState}>
            <Radio color={colors.textSubtle} size={30} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No live status board today</Text>
            <Text style={styles.emptyText}>
              Committed Anjuman schedule events will appear here automatically.
            </Text>
          </View>
        ) : null}
      </View>
    </AppShell>
  );
}

function TimelineItem({
  item,
  index,
  isLast,
}: {
  item: StatusItem;
  index: number;
  isLast: boolean;
}) {
  const active = item.status === 'Started' || item.status === 'En Route';
  const completed = item.status === 'Completed';

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineRail}>
        <View
          style={[
            styles.stopMarker,
            active && styles.activeMarker,
            completed && styles.completedMarker,
          ]}
        >
          {completed ? (
            <Check color={colors.onIvory} size={16} strokeWidth={2.6} />
          ) : (
            <Text style={[styles.stopNumber, active && styles.activeStopNumber]}>{index + 1}</Text>
          )}
        </View>
        {!isLast ? <View style={[styles.routeLine, completed && styles.completedLine]} /> : null}
      </View>

      <View style={[styles.stopContent, isLast && styles.lastStopContent]}>
        <View style={styles.stopTopRow}>
          <View style={styles.stopTimeRow}>
            <Clock3 color={active ? colors.gold : colors.textSubtle} size={16} strokeWidth={1.8} />
            <Text style={[styles.stopTime, active && styles.activeStopTime]}>{item.time || 'TBA'}</Text>
          </View>
          <StatusLabel status={item.status} />
        </View>
        <Text style={styles.stopName}>{item.contactName || item.title || 'Majlis'}</Text>
        <Text style={styles.stopProgram}>{item.title || 'Program details pending'}</Text>
        {item.stage ? (
          <View style={styles.stageRow}>
            <Radio color={colors.gold} size={15} strokeWidth={2} />
            <Text style={styles.stageText}>{item.stage}</Text>
          </View>
        ) : null}
        {item.address ? (
          <Pressable
            onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`)}
            style={styles.addressLink}
          >
            <MapPin color={colors.blue} size={16} strokeWidth={1.8} />
            <Text style={styles.addressText}>{item.address}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function StatusLabel({ status }: { status: MajlisStatus }) {
  const Icon = status === 'Completed'
    ? Check
    : status === 'En Route'
      ? Navigation
      : status === 'Delayed'
        ? TriangleAlert
        : status === 'Started'
          ? Radio
          : Clock3;

  return (
    <View style={[styles.statusLabel, styles[`${statusKey(status)}Status`]]}>
      <Icon color={statusColor(status)} size={14} strokeWidth={2} />
      <Text style={[styles.statusText, { color: statusColor(status) }]}>{status}</Text>
    </View>
  );
}

function statusKey(status: MajlisStatus) {
  return status.toLowerCase().replace(/\s+/g, '') as 'pending' | 'enroute' | 'started' | 'completed' | 'delayed' | 'skipped';
}

function statusColor(status: MajlisStatus) {
  if (status === 'Completed') return colors.greenSoft;
  if (status === 'Started') return colors.gold;
  if (status === 'En Route') return colors.blue;
  if (status === 'Delayed') return colors.red;
  return colors.muted;
}

const styles = StyleSheet.create({
  liveSummary: {
    backgroundColor: colors.oxbloodDeep,
    borderLeftColor: colors.gold,
    borderLeftWidth: 3,
    borderRadius: radii.md,
    marginTop: spacing.lg,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  liveHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  liveLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  liveDot: {
    backgroundColor: colors.red,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  liveLabel: {
    color: colors.goldSoft,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  progressText: {
    color: colors.ivoryMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.small,
  },
  currentGrid: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  currentCopy: {
    flex: 1,
    minWidth: 240,
  },
  currentEyebrow: {
    color: colors.ivoryMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.small,
  },
  currentName: {
    color: colors.ivory,
    fontFamily: fonts.displayMedium,
    fontSize: 38,
    lineHeight: 42,
    marginTop: spacing.xs,
  },
  currentProgram: {
    color: colors.ivoryMuted,
    fontFamily: fonts.body,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  stageBlock: {
    borderLeftColor: 'rgba(234, 217, 170, .32)',
    borderLeftWidth: 1,
    minWidth: 190,
    paddingLeft: spacing.lg,
  },
  stageLabel: {
    color: colors.ivoryMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.overline,
  },
  stageValue: {
    color: colors.goldSoft,
    fontFamily: fonts.displayMedium,
    fontSize: 24,
    lineHeight: 28,
    marginTop: spacing.xs,
  },
  progressTrack: {
    backgroundColor: 'rgba(247, 241, 231, .12)',
    height: 3,
    marginTop: spacing.lg,
  },
  progressFill: {
    backgroundColor: colors.gold,
    height: 3,
  },
  routeHeading: {
    paddingBottom: spacing.md,
    paddingTop: spacing.xl,
  },
  routeEyebrow: {
    color: colors.gold,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  routeTitle: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: 30,
    lineHeight: 34,
    marginTop: spacing.xs,
  },
  timeline: {
    paddingBottom: spacing.lg,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineRail: {
    alignItems: 'center',
    width: 42,
  },
  stopMarker: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  activeMarker: {
    backgroundColor: colors.ivory,
    borderColor: colors.gold,
    borderWidth: 3,
  },
  completedMarker: {
    backgroundColor: colors.greenSoft,
    borderColor: colors.greenSoft,
  },
  stopNumber: {
    color: colors.muted,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
  },
  activeStopNumber: {
    color: colors.onIvory,
  },
  routeLine: {
    backgroundColor: colors.border,
    flex: 1,
    minHeight: 110,
    width: 1,
  },
  completedLine: {
    backgroundColor: colors.green,
  },
  stopContent: {
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    flex: 1,
    minHeight: 170,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  lastStopContent: {
    borderBottomWidth: 0,
  },
  stopTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  stopTimeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stopTime: {
    color: colors.muted,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.small,
  },
  activeStopTime: {
    color: colors.goldSoft,
  },
  statusLabel: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    minHeight: 30,
    paddingHorizontal: spacing.sm,
  },
  pendingStatus: {
    backgroundColor: colors.surfaceAlt,
  },
  enrouteStatus: {
    backgroundColor: colors.sistersBg,
  },
  startedStatus: {
    backgroundColor: colors.committedBg,
  },
  completedStatus: {
    backgroundColor: colors.communityBg,
  },
  delayedStatus: {
    backgroundColor: colors.oxbloodDeep,
  },
  skippedStatus: {
    backgroundColor: colors.surfaceAlt,
  },
  statusText: {
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
  },
  stopName: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: 28,
    lineHeight: 32,
    marginTop: spacing.sm,
  },
  stopProgram: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: 2,
  },
  stageRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  stageText: {
    color: colors.goldSoft,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.small,
  },
  addressLink: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    maxWidth: 620,
  },
  addressText: {
    color: colors.blueSoft,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: typography.small,
    lineHeight: 19,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: typography.title,
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.xs,
    maxWidth: 460,
    textAlign: 'center',
  },
});
