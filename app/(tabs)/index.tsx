import { useEffect, useMemo, useState } from 'react';
import { Stack } from 'expo-router';
import { Image, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppShell } from '@/components/AppShell';
import { HomeScheduleBoard, HomeScheduleFilter } from '@/components/HomeScheduleBoard';
import { LiveStream } from '@/components/LiveStream';
import { colors, radii, spacing, typography } from '@/constants/theme';
import {
  CommunityEvent,
  events as fallbackEvents,
  islamicTodayLabel,
  prayerTimes as fallbackPrayerTimes,
  PrayerTime,
  socialLinks,
  specialEvent as fallbackSpecialEvent,
  SpecialEvent,
  todayLabel,
} from '@/data/mock';
import { fetchEvents, fetchHome } from '@/lib/api';

const audienceMatch: Record<Exclude<HomeScheduleFilter, 'all' | 'anjuman'>, (eventType: string) => boolean> = {
  brothers: (eventType) => ['M', 'F', 'A'].includes(eventType),
  sisters: (eventType) => ['W', 'F', 'A'].includes(eventType),
  family: (eventType) => ['F', 'A'].includes(eventType),
};

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [audience, setAudience] = useState<HomeScheduleFilter>('anjuman');
  const [homeEvents, setHomeEvents] = useState<CommunityEvent[]>(fallbackEvents);
  const [allEvents, setAllEvents] = useState<CommunityEvent[]>(fallbackEvents);
  const [times, setTimes] = useState<PrayerTime[]>(fallbackPrayerTimes);
  const [currentDate, setCurrentDate] = useState(fallbackEvents[0]?.date || '');
  const [currentLabel, setCurrentLabel] = useState(todayLabel);
  const [currentIslamicLabel, setCurrentIslamicLabel] = useState(islamicTodayLabel);
  const [featured, setFeatured] = useState<SpecialEvent>(fallbackSpecialEvent);

  useEffect(() => {
    let active = true;

    Promise.all([fetchHome(), fetchEvents('all')]).then(([home, events]) => {
      if (!active) return;
      setHomeEvents(home.upcomingEvents);
      setAllEvents(events);
      setTimes(home.prayerTimes);
      setCurrentDate(home.date || fallbackEvents[0]?.date || '');
      setCurrentLabel(home.label || todayLabel);
      setCurrentIslamicLabel(home.islamicDate?.label || islamicTodayLabel);
      setFeatured(home.specialEvent);
    });

    return () => {
      active = false;
    };
  }, []);

  const mergedEvents = useMemo(() => dedupeEvents([...homeEvents, ...allEvents]), [allEvents, homeEvents]);

  const scheduleEvents = useMemo(() => {
    if (audience === 'all') return mergedEvents;
    if (audience === 'anjuman') return mergedEvents.filter((event) => event.isAnjumanSchedule);
    return mergedEvents.filter((event) => audienceMatch[audience](event.type));
  }, [audience, mergedEvents]);

  const todayEvents = useMemo(
    () => mergedEvents.filter((event) => event.date === currentDate),
    [currentDate, mergedEvents],
  );
  const nextAnjuman = mergedEvents.find((event) => event.isAnjumanSchedule) ?? mergedEvents[0];
  const anjumanCount = mergedEvents.filter((event) => event.isAnjumanSchedule).length;
  const communityCount = mergedEvents.filter((event) => !event.isAnjumanSchedule).length;

  return (
    <>
      <Stack.Screen options={{ title: 'Anjuman Pasban-e-Aza - Houston' }} />
      <AppShell title="Anjuman Pasban-e-Aza" subtitle="Houston, TX">
        <View style={styles.intro}>
          <View style={styles.introCopy}>
            <Text style={styles.kicker}>Houston azadari schedule</Text>
            <Text style={styles.introText}>
              Find committed Anjuman programs, approved community majalis, flyers, and live status in one place.
            </Text>
          </View>
          <View style={styles.dateGrid}>
            <DatePill label="Today" value={currentLabel} />
            <DatePill label="Hijri" value={currentIslamicLabel} />
          </View>
        </View>

        <View style={[styles.primaryGrid, isWide && styles.primaryGridWide]}>
          <View style={styles.schedulePane}>
            <HomeScheduleBoard activeFilter={audience} events={scheduleEvents} onFilterChange={setAudience} />
          </View>

          <View style={[styles.sideRail, isWide && styles.sideRailWide]}>
            <NextProgramCard event={nextAnjuman} />
            <MetricStrip todayCount={todayEvents.length} anjumanCount={anjumanCount} communityCount={communityCount} />
            {featured.isActive ? <FeaturedFlyer event={featured} /> : null}
            <CompactPrayerCard times={times} />
          </View>
        </View>

        <View style={[styles.lowerGrid, isWide && styles.lowerGridWide]}>
          <View style={styles.broadcastCard}>
            <Text style={styles.kicker}>Broadcast</Text>
            <Text style={styles.sectionHeading}>Pasban-e-Aza Live</Text>
            <Text style={styles.mutedText}>Livestreams can be featured here when active without displacing the schedule.</Text>
            <View style={styles.liveFrame}>
              <LiveStream title="Pasban-e-Aza Live" embedUrl={featured.liveStreamUrl || 'https://www.youtube.com/embed/live_stream?channel=UC_PLACEHOLDER'} />
            </View>
          </View>

          <View style={styles.connectCard}>
            <Text style={styles.kicker}>Stay current</Text>
            <Text style={styles.sectionHeading}>Reminders, membership, and volunteering</Text>
            <Text style={styles.mutedText}>Sign up flows will connect to the API-backed forms as the beta hardens.</Text>
            <View style={styles.socialStack}>
              {socialLinks.map((link) => (
                <Pressable key={link.label} onPress={() => Linking.openURL(link.url)} style={styles.socialButton}>
                  <Text style={styles.socialLabel}>{link.label}</Text>
                  <Text style={styles.socialUrl}>{link.url.replace('https://', '')}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </AppShell>
    </>
  );
}

function DatePill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.datePill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

function NextProgramCard({ event }: { event?: CommunityEvent }) {
  return (
    <View style={styles.sideCard}>
      <Text style={styles.kicker}>Next committed program</Text>
      {event ? (
        <>
          <Text style={styles.nextTime}>{event.time}</Text>
          <Text style={styles.nextContact}>{event.contactName || event.title}</Text>
          <Text style={styles.mutedText}>{event.title}</Text>
          <Text style={styles.locationText}>{event.locationName}</Text>
        </>
      ) : (
        <Text style={styles.mutedText}>No committed Anjuman program listed.</Text>
      )}
    </View>
  );
}

function MetricStrip({
  todayCount,
  anjumanCount,
  communityCount,
}: {
  todayCount: number;
  anjumanCount: number;
  communityCount: number;
}) {
  return (
    <View style={styles.metricStrip}>
      <Metric label="Today" value={todayCount} />
      <Metric label="Anjuman" value={anjumanCount} />
      <Metric label="Community" value={communityCount} />
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function FeaturedFlyer({ event }: { event: SpecialEvent }) {
  return (
    <View style={styles.sideCard}>
      {event.flyerUrl ? (
        <Image source={{ uri: event.flyerUrl }} style={styles.flyerImage} resizeMode="cover" />
      ) : null}
      <Text style={styles.kicker}>{event.eyebrow}</Text>
      <Text style={styles.flyerTitle}>{event.title}</Text>
      <Text style={styles.mutedText}>{event.description}</Text>
    </View>
  );
}

function CompactPrayerCard({ times }: { times: PrayerTime[] }) {
  return (
    <View style={styles.sideCard}>
      <Text style={styles.kicker}>Prayer</Text>
      <View style={styles.prayerGrid}>
        {times.slice(0, 5).map((item) => (
          <View key={item.label} style={styles.prayerItem}>
            <Text style={styles.prayerLabel}>{item.label}</Text>
            <Text style={styles.prayerTime}>{item.time}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function dedupeEvents(events: CommunityEvent[]) {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

const styles = StyleSheet.create({
  intro: {
    borderBottomColor: colors.nightLine,
    borderBottomWidth: 1,
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
  },
  introCopy: {
    gap: spacing.xs,
  },
  kicker: {
    color: colors.gold,
    fontSize: typography.label,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  introText: {
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: '700',
    lineHeight: 22,
    maxWidth: 680,
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  datePill: {
    backgroundColor: colors.nightCard,
    borderColor: colors.nightLine,
    borderRadius: radii.sm,
    borderWidth: 1,
    minWidth: 156,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pillLabel: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  pillValue: {
    color: colors.text,
    fontSize: typography.lead,
    fontWeight: '900',
    marginTop: 2,
  },
  primaryGrid: {
    gap: spacing.md,
  },
  primaryGridWide: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  schedulePane: {
    flex: 1,
    minWidth: 0,
  },
  sideRail: {
    gap: spacing.md,
  },
  sideRailWide: {
    width: 340,
  },
  sideCard: {
    backgroundColor: colors.nightCard,
    borderColor: colors.nightLine,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  nextTime: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  nextContact: {
    color: colors.text,
    fontSize: typography.lead,
    fontWeight: '900',
  },
  mutedText: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  locationText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  metricStrip: {
    backgroundColor: colors.nightCard,
    borderColor: colors.nightLine,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  metric: {
    alignItems: 'center',
    borderRightColor: colors.nightLine,
    borderRightWidth: 1,
    flex: 1,
    padding: spacing.md,
  },
  metricValue: {
    color: colors.gold,
    fontSize: 26,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: '900',
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  flyerImage: {
    aspectRatio: 4 / 3,
    borderRadius: radii.sm,
    width: '100%',
  },
  flyerTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '900',
    lineHeight: 30,
  },
  prayerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  prayerItem: {
    backgroundColor: colors.nightRaised,
    borderRadius: radii.sm,
    minWidth: 118,
    padding: spacing.sm,
  },
  prayerLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  prayerTime: {
    color: colors.text,
    fontSize: typography.lead,
    fontWeight: '900',
    marginTop: 2,
  },
  lowerGrid: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  lowerGridWide: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  broadcastCard: {
    backgroundColor: colors.nightCard,
    borderColor: colors.nightLine,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
  },
  connectCard: {
    backgroundColor: colors.oxblood,
    borderColor: 'rgba(255, 255, 255, .18)',
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  sectionHeading: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '900',
    lineHeight: 30,
    marginTop: spacing.xs,
  },
  liveFrame: {
    marginTop: spacing.md,
  },
  socialStack: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  socialButton: {
    borderColor: 'rgba(255, 255, 255, .24)',
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing.md,
  },
  socialLabel: {
    color: colors.text,
    fontSize: typography.lead,
    fontWeight: '900',
  },
  socialUrl: {
    color: 'rgba(255, 250, 240, .72)',
    fontSize: typography.small,
    marginTop: 2,
  },
});
