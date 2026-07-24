import { useEffect, useMemo, useState } from 'react';
import { Link, Stack } from 'expo-router';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Camera,
  MapPin,
  Play,
  Radio,
  Users,
} from 'lucide-react-native';
import {
  Image,
  ImageBackground,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppShell } from '@/components/AppShell';
import { HomeScheduleBoard, HomeScheduleFilter } from '@/components/HomeScheduleBoard';
import { LiveStream } from '@/components/LiveStream';
import { colors, fonts, radii, spacing, typography } from '@/constants/theme';
import {
  CommunityEvent,
  events as fallbackEvents,
  islamicTodayLabel,
  prayerTimes as fallbackPrayerTimes,
  PrayerTime,
  socialLinks,
  specialEvent as fallbackSpecialEvent,
  SpecialEvent,
  StatusItem,
  todayLabel,
} from '@/data/mock';
import { useResponsiveWidth } from '@/hooks/useResponsiveWidth';
import { fetchEvents, fetchHome, fetchTodayMajlis } from '@/lib/api';
import { AuthUser, subscribeToAuthState } from '@/lib/auth';
import { formatGregorianDate, getRelativeDateLabel } from '@/lib/datePresentation';
import {
  filterUpcomingEvents,
  isActiveMajlis,
  selectNextCommittedEvent,
} from '@/lib/eventTiming';

const audienceMatch: Record<Exclude<HomeScheduleFilter, 'all' | 'anjuman'>, (eventType: string) => boolean> = {
  brothers: (eventType) => ['M', 'F', 'A'].includes(eventType),
  sisters: (eventType) => ['W', 'F', 'A'].includes(eventType),
  family: (eventType) => ['F', 'A'].includes(eventType),
};

export default function HomeScreen() {
  const width = useResponsiveWidth();
  const compact = width < 820;
  const [audience, setAudience] = useState<HomeScheduleFilter>('anjuman');
  const [homeEvents, setHomeEvents] = useState<CommunityEvent[]>(fallbackEvents);
  const [allEvents, setAllEvents] = useState<CommunityEvent[]>(fallbackEvents);
  const [times, setTimes] = useState<PrayerTime[]>(fallbackPrayerTimes);
  const [currentDate, setCurrentDate] = useState(fallbackEvents[0]?.date || '');
  const [currentLabel, setCurrentLabel] = useState(todayLabel);
  const [currentIslamicLabel, setCurrentIslamicLabel] = useState(islamicTodayLabel);
  const [featured, setFeatured] = useState<SpecialEvent>(fallbackSpecialEvent);
  const [liveStatuses, setLiveStatuses] = useState<StatusItem[]>([]);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    let active = true;

    Promise.all([fetchHome(), fetchEvents('all'), fetchTodayMajlis()]).then(([home, events, statuses]) => {
      if (!active) return;
      setHomeEvents(home.upcomingEvents);
      setAllEvents(events);
      setLiveStatuses(statuses);
      setTimes(home.prayerTimes);
      setCurrentDate(home.date || fallbackEvents[0]?.date || '');
      setCurrentLabel(home.label || todayLabel);
      setCurrentIslamicLabel(home.islamicDate?.label || islamicTodayLabel);
      setFeatured(home.specialEvent);
    });

    const refreshTimer = setInterval(() => {
      setClock(new Date());
      fetchTodayMajlis().then((statuses) => {
        if (active) setLiveStatuses(statuses);
      });
    }, 30_000);

    return () => {
      active = false;
      clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => subscribeToAuthState(setAuthUser), []);

  const mergedEvents = useMemo(() => dedupeEvents([...homeEvents, ...allEvents]), [allEvents, homeEvents]);
  const upcomingEvents = useMemo(
    () => filterUpcomingEvents(mergedEvents, liveStatuses, clock),
    [clock, liveStatuses, mergedEvents],
  );
  const scheduleEvents = useMemo(() => {
    if (audience === 'all') return upcomingEvents;
    if (audience === 'anjuman') return upcomingEvents.filter((event) => event.isAnjumanSchedule);
    return upcomingEvents.filter((event) => audienceMatch[audience](event.type));
  }, [audience, upcomingEvents]);
  const todayEvents = useMemo(
    () => mergedEvents.filter((event) => event.date === currentDate),
    [currentDate, mergedEvents],
  );
  const nextAnjuman = selectNextCommittedEvent(mergedEvents, liveStatuses, clock);
  const nextAnjumanIsActive = nextAnjuman ? isActiveMajlis(nextAnjuman.id, liveStatuses) : false;
  const nextDateRelation = nextAnjuman
    ? getRelativeDateLabel(nextAnjuman.date, currentDate)
    : '';
  const nextMajlisLabel = nextAnjumanIsActive
    ? 'Current committed majlis'
    : nextDateRelation === 'Today'
      ? 'Later today'
      : nextDateRelation === 'Tomorrow'
        ? "Tomorrow's committed majlis"
        : 'Next committed majlis';
  const hasRealFlyer = Boolean(featured.isActive && featured.flyerUrl);
  const hasLiveStream = Boolean(
    featured.liveStreamUrl && !featured.liveStreamUrl.includes('PLACEHOLDER'),
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Anjuman Pasban-e-Aza · Houston' }} />
      <AppShell title="Anjuman Pasban-e-Aza">
        <View style={[styles.todayHero, compact && styles.compactHero]}>
          <View style={[styles.dateBlock, compact && styles.compactDateBlock]}>
            <Text style={styles.heroEyebrow}>Today in Houston</Text>
            <Text style={styles.heroDate}>{currentLabel}</Text>
            <View style={styles.hijriRow}>
              <CalendarDays color={colors.gold} size={17} strokeWidth={1.8} />
              <Text style={styles.hijriDate}>{currentIslamicLabel}</Text>
            </View>
          </View>

          <View style={[styles.nextBlock, compact && styles.compactNextBlock]}>
            <Text style={styles.nextLabel}>{nextMajlisLabel}</Text>
            {nextAnjuman ? (
              <>
                <View style={styles.nextDateRow}>
                  <CalendarDays color={colors.gold} size={16} strokeWidth={1.8} />
                  <View style={styles.nextDateCopy}>
                    <Text style={styles.nextGregorianDate}>
                      {formatGregorianDate(nextAnjuman.date, 'long')}
                    </Text>
                    {nextAnjuman.islamicDate ? (
                      <Text style={styles.nextIslamicDate}>{nextAnjuman.islamicDate}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.nextTitleRow}>
                  <Text style={styles.nextTime}>{nextAnjuman.time || 'TBA'}</Text>
                  <View style={styles.nextRule} />
                  <Text style={styles.nextHost}>{nextAnjuman.contactName || nextAnjuman.title}</Text>
                </View>
                <Text style={styles.nextProgram}>{nextAnjuman.title}</Text>
                <Pressable
                  disabled={!nextAnjuman.address}
                  onPress={() => openMaps(nextAnjuman.address)}
                  style={styles.locationLink}
                >
                  <MapPin color={colors.gold} size={16} strokeWidth={1.8} />
                  <Text style={styles.locationText}>
                    {nextAnjuman.locationName || nextAnjuman.address || 'Location to be announced'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.nextProgram}>No committed program is currently listed.</Text>
            )}
          </View>
        </View>

        {hasRealFlyer ? <FeaturedFlyer event={featured} /> : null}

        <View style={styles.primaryGrid}>
          <View style={styles.schedulePane}>
            <HomeScheduleBoard
              activeFilter={audience}
              canEdit={Boolean(authUser?.isAdmin)}
              events={scheduleEvents}
              onFilterChange={setAudience}
            />
          </View>

          <View style={styles.sideRail}>
            <AtAGlance
              todayCount={todayEvents.length}
              committedCount={mergedEvents.filter((event) => event.isAnjumanSchedule).length}
              communityCount={mergedEvents.filter((event) => !event.isAnjumanSchedule).length}
            />
            <PrayerPreview times={times} />
            {!hasRealFlyer && featured.isActive ? <FeaturedNotice event={featured} /> : null}
            <CommunityLinks />
          </View>
        </View>

        <View style={styles.lowerBand}>
          <View style={styles.lowerBandCopy}>
            <View style={styles.liveTitleRow}>
              <Radio color={colors.red} size={20} strokeWidth={2} />
              <Text style={styles.sectionEyebrow}>Pasban broadcast</Text>
            </View>
            <Text style={styles.sectionTitle}>
              {hasLiveStream ? 'Live from the current program' : 'Livestreams, when they matter'}
            </Text>
            <Text style={styles.sectionText}>
              {hasLiveStream
                ? 'Watch the active Pasban-e-Aza broadcast without leaving the schedule.'
                : 'An active YouTube broadcast will appear here automatically without displacing the schedule.'}
            </Text>
          </View>
          <View style={styles.liveFrame}>
            {hasLiveStream ? (
              <LiveStream title={featured.title} embedUrl={featured.liveStreamUrl || ''} />
            ) : (
              <View style={styles.offlineFrame}>
                <Image
                  source={require('@/assets/images/pasban-logo-ui-black.png')}
                  style={styles.offlineMark}
                  resizeMode="contain"
                />
                <Text style={styles.offlineText}>No live broadcast right now</Text>
              </View>
            )}
          </View>
        </View>
      </AppShell>
    </>
  );
}

function AtAGlance({
  todayCount,
  committedCount,
  communityCount,
}: {
  todayCount: number;
  committedCount: number;
  communityCount: number;
}) {
  return (
    <View style={styles.railSection}>
      <Text style={styles.railEyebrow}>At a glance</Text>
      <View style={styles.metricRow}>
        <Metric value={todayCount} label="Today" />
        <Metric value={committedCount} label="Committed" />
        <Metric value={communityCount} label="Community" />
      </View>
    </View>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function PrayerPreview({ times }: { times: PrayerTime[] }) {
  return (
    <View style={styles.railSection}>
      <View style={styles.railHeader}>
        <View>
          <Text style={styles.railEyebrow}>Prayer times</Text>
          <Text style={styles.railTitle}>Houston</Text>
        </View>
        <Link href="/prayer" asChild>
          <Pressable accessibilityLabel="View prayer times" style={styles.iconLink}>
            <ArrowRight color={colors.gold} size={19} strokeWidth={2} />
          </Pressable>
        </Link>
      </View>
      <View style={styles.prayerList}>
        {times.slice(0, 5).map((item) => (
          <View key={item.label} style={styles.prayerRow}>
            <Text style={styles.prayerLabel}>{item.label}</Text>
            <Text style={styles.prayerTime}>{item.time}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function FeaturedFlyer({ event }: { event: SpecialEvent }) {
  return (
    <ImageBackground source={{ uri: event.flyerUrl }} style={styles.flyer} imageStyle={styles.flyerImage}>
      <View style={styles.flyerOverlay}>
        <Text style={styles.flyerEyebrow}>{event.eyebrow}</Text>
        <Text style={styles.flyerTitle}>{event.title}</Text>
        <Text style={styles.flyerDate}>{event.dateLabel}</Text>
        <Text style={styles.flyerDescription}>{event.description}</Text>
      </View>
    </ImageBackground>
  );
}

function FeaturedNotice({ event }: { event: SpecialEvent }) {
  return (
    <View style={styles.featuredNotice}>
      <Image
        source={require('@/assets/images/pasban-logo-ui-black.png')}
        style={styles.featuredMark}
        resizeMode="contain"
      />
      <View style={styles.featuredContent}>
        <Text style={styles.featuredEyebrow}>{event.eyebrow}</Text>
        <Text style={styles.featuredTitle}>{event.title}</Text>
        <Text style={styles.featuredDate}>{event.dateLabel}</Text>
      </View>
    </View>
  );
}

function CommunityLinks() {
  return (
    <View style={styles.railSection}>
      <Text style={styles.railEyebrow}>Stay connected</Text>
      <View style={styles.communityActions}>
        <Link href="/connect" asChild>
          <Pressable style={styles.communityAction}>
            <Bell color={colors.muted} size={18} strokeWidth={1.8} />
            <Text style={styles.communityActionText}>Reminders</Text>
          </Pressable>
        </Link>
        <Link href="/connect" asChild>
          <Pressable style={styles.communityAction}>
            <Users color={colors.muted} size={18} strokeWidth={1.8} />
            <Text style={styles.communityActionText}>Volunteer</Text>
          </Pressable>
        </Link>
      </View>
      <View style={styles.socialRow}>
        {socialLinks.slice(0, 2).map((link) => {
          const Icon = link.label === 'Instagram' ? Camera : Play;
          return (
            <Pressable key={link.label} onPress={() => Linking.openURL(link.url)} style={styles.socialLink}>
              <Icon color={colors.gold} size={19} strokeWidth={1.8} />
              <Text style={styles.socialText}>{link.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function openMaps(address?: string) {
  if (!address) return;
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
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
  todayHero: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: spacing.xl,
    minHeight: 205,
    paddingVertical: spacing.xl,
  },
  compactHero: {
    flexDirection: 'column',
    gap: spacing.lg,
    minHeight: 0,
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
  },
  dateBlock: {
    flexBasis: 340,
    flexGrow: 1,
    justifyContent: 'center',
  },
  compactDateBlock: {
    flexBasis: 'auto',
    flexGrow: 0,
  },
  heroEyebrow: {
    color: colors.red,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  heroDate: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: 48,
    lineHeight: 52,
    marginTop: spacing.xs,
  },
  hijriRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  hijriDate: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.body,
  },
  nextBlock: {
    borderLeftColor: colors.goldDark,
    borderLeftWidth: 2,
    flexBasis: 480,
    flexGrow: 1,
    justifyContent: 'center',
    paddingLeft: spacing.xl,
  },
  compactNextBlock: {
    flexBasis: 'auto',
    flexGrow: 0,
    minHeight: 0,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  nextLabel: {
    color: colors.gold,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  nextDateRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  nextDateCopy: {
    flex: 1,
    gap: 1,
  },
  nextGregorianDate: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.small,
    lineHeight: 18,
  },
  nextIslamicDate: {
    color: colors.goldSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.overline,
    lineHeight: 16,
  },
  nextTitleRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  nextTime: {
    color: colors.ink,
    fontFamily: fonts.displaySemibold,
    fontSize: 32,
    lineHeight: 36,
  },
  nextRule: {
    backgroundColor: colors.border,
    height: 1,
    width: 28,
  },
  nextHost: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: 28,
    lineHeight: 32,
  },
  nextProgram: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  locationLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    minHeight: 30,
  },
  locationText: {
    color: colors.goldSoft,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.small,
  },
  primaryGrid: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  schedulePane: {
    flex: 1,
    flexBasis: 760,
    minWidth: 0,
  },
  sideRail: {
    flexBasis: 300,
    flexGrow: 1,
    gap: 0,
  },
  railSection: {
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
  },
  railEyebrow: {
    color: colors.textSubtle,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  railHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  railTitle: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: 27,
    lineHeight: 31,
    marginTop: spacing.xs,
  },
  iconLink: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  metricRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  metric: {
    flex: 1,
  },
  metricValue: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: 32,
    lineHeight: 36,
  },
  metricLabel: {
    color: colors.textSubtle,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    marginTop: 2,
  },
  prayerList: {
    marginTop: spacing.md,
  },
  prayerRow: {
    alignItems: 'baseline',
    borderTopColor: colors.borderSoft,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  prayerLabel: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.small,
  },
  prayerTime: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.body,
  },
  flyer: {
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    minHeight: 360,
    overflow: 'hidden',
  },
  flyerImage: {
    borderRadius: radii.md,
  },
  flyerOverlay: {
    backgroundColor: 'rgba(9, 8, 7, .7)',
    flex: 1,
    justifyContent: 'flex-end',
    minHeight: 360,
    padding: spacing.xl,
  },
  flyerEyebrow: {
    color: colors.gold,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  flyerTitle: {
    color: colors.ivory,
    fontFamily: fonts.displayMedium,
    fontSize: 48,
    lineHeight: 52,
    marginTop: spacing.sm,
  },
  flyerDate: {
    color: colors.goldSoft,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.lead,
    marginTop: spacing.sm,
  },
  flyerDescription: {
    color: colors.ivoryMuted,
    fontFamily: fonts.body,
    fontSize: typography.body,
    lineHeight: 23,
    marginTop: spacing.sm,
    maxWidth: 680,
  },
  featuredNotice: {
    backgroundColor: colors.oxblood,
    borderRadius: radii.md,
    minHeight: 210,
    overflow: 'hidden',
    padding: spacing.lg,
    position: 'relative',
  },
  featuredMark: {
    bottom: -42,
    height: 230,
    opacity: 0.22,
    position: 'absolute',
    right: -46,
    transform: [{ rotate: '-7deg' }],
    width: 230,
  },
  featuredContent: {
    maxWidth: 220,
    zIndex: 1,
  },
  featuredEyebrow: {
    color: colors.goldSoft,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  featuredTitle: {
    color: colors.ivory,
    fontFamily: fonts.displayMedium,
    fontSize: 30,
    lineHeight: 34,
    marginTop: spacing.sm,
  },
  featuredDate: {
    color: colors.ivoryMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.small,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  communityActions: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  communityAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 38,
  },
  communityActionText: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.small,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  socialLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 34,
  },
  socialText: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.small,
  },
  lowerBand: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
    marginTop: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  lowerBandCopy: {
    flex: 1,
    flexBasis: 340,
  },
  liveTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sectionEyebrow: {
    color: colors.red,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: 36,
    lineHeight: 40,
    marginTop: spacing.sm,
  },
  sectionText: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: typography.body,
    lineHeight: 23,
    marginTop: spacing.sm,
    maxWidth: 520,
  },
  liveFrame: {
    flex: 1,
    flexBasis: 540,
    minWidth: 0,
  },
  offlineFrame: {
    alignItems: 'center',
    aspectRatio: 16 / 9,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  offlineMark: {
    height: 150,
    opacity: 0.28,
    width: 150,
  },
  offlineText: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.small,
    marginTop: spacing.sm,
  },
});
