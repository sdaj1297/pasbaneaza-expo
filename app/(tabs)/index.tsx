import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/Card';
import { EventCard } from '@/components/EventCard';
import { LiveStream } from '@/components/LiveStream';
import { SectionTitle } from '@/components/SectionTitle';
import { SpecialEventBanner } from '@/components/SpecialEventBanner';
import { colors, spacing } from '@/constants/theme';
import {
  announcements,
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
import { fetchHome } from '@/lib/api';

export default function HomeScreen() {
  const [nextEvents, setNextEvents] = useState<CommunityEvent[]>(fallbackEvents.slice(0, 3));
  const [times, setTimes] = useState<PrayerTime[]>(fallbackPrayerTimes);
  const [currentLabel, setCurrentLabel] = useState(todayLabel);
  const [currentIslamicLabel, setCurrentIslamicLabel] = useState(islamicTodayLabel);
  const [featured, setFeatured] = useState<SpecialEvent>(fallbackSpecialEvent);

  useEffect(() => {
    let active = true;

    fetchHome().then((home) => {
      if (!active) return;
      setNextEvents(home.upcomingEvents.slice(0, 3));
      setTimes(home.prayerTimes);
      setCurrentLabel(home.label || todayLabel);
      setCurrentIslamicLabel(home.islamicDate?.label || islamicTodayLabel);
      setFeatured(home.specialEvent);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell title="Anjuman Pasban-e-Aza" subtitle="Houston, Texas">
      {featured.isActive ? <SpecialEventBanner event={featured} /> : null}

      <View style={styles.overviewGrid}>
        <Card>
          <Text style={styles.date}>{currentLabel}</Text>
          <Text style={styles.islamicDate}>{currentIslamicLabel}</Text>
        </Card>
        <Card>
          <Text style={styles.missionKicker}>Community</Text>
          <Text style={styles.missionText}>Programs, majalis, reminders, and service opportunities for the Houston azadari community.</Text>
        </Card>
      </View>

      <SectionTitle title="Featured Broadcast" action="YouTube" />
      <LiveStream title="Pasban-e-Aza Live" embedUrl={featured.liveStreamUrl || 'https://www.youtube.com/embed/live_stream?channel=UC_PLACEHOLDER'} />

      <SectionTitle title="Today" />
      <Card>
        <Text style={styles.date}>{currentLabel}</Text>
        <Text style={styles.islamicDate}>{currentIslamicLabel}</Text>
      </Card>

      <SectionTitle title="Announcements" />
      <View style={styles.stack}>
        {announcements.map((announcement) => (
          <Card key={announcement}>
            <Text style={styles.body}>{announcement}</Text>
          </Card>
        ))}
      </View>

      <SectionTitle title="Prayer Today" action="Houston" />
      <Card>
        <View style={styles.prayerGrid}>
          {times.map((item) => (
            <View key={item.label} style={styles.prayerItem}>
              <Text style={styles.prayerLabel}>{item.label}</Text>
              <Text style={styles.prayerTime}>{item.time}</Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle title="Upcoming Majalis" action="View all" />
      <View style={styles.stack}>
        {nextEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </View>

      <SectionTitle title="Stay Connected" />
      <View style={styles.socialGrid}>
        {socialLinks.map((link) => (
          <ActionButton key={link.label} variant="outline" onPress={() => Linking.openURL(link.url)}>
            {link.label}
          </ActionButton>
        ))}
      </View>

      <SectionTitle title="Get Involved" />
      <Card>
        <Text style={styles.body}>Sign up for reminders, membership updates, or volunteer opportunities. This will connect to the future API/CRM flow.</Text>
        <View style={styles.actionRow}>
          <ActionButton>Reminders</ActionButton>
          <ActionButton variant="dark">Volunteer</ActionButton>
          <ActionButton variant="outline">Membership</ActionButton>
        </View>
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  date: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  islamicDate: {
    color: colors.red,
    fontSize: 24,
    fontWeight: '900',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  stack: {
    gap: spacing.sm,
  },
  overviewGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  missionKicker: {
    color: colors.goldDark,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  missionText: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 25,
    marginTop: spacing.xs,
  },
  body: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
  },
  prayerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  prayerItem: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    minWidth: 116,
    padding: spacing.sm,
  },
  prayerLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  prayerTime: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
