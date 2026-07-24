import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { colors, radii, spacing } from '@/constants/theme';
import { CommunityEvent } from '@/data/mock';
import { getEventAudienceLabel, getEventTone, getEventToneLabel } from '@/lib/eventPresentation';

type EventCardProps = {
  event: CommunityEvent;
  showScheduleMark?: boolean;
};

export function EventCard({ event, showScheduleMark = true }: EventCardProps) {
  const openMaps = () => {
    if (!event.address) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`);
  };
  const dateLabel = event.islamicDate || event.date;
  const title = event.title || 'Majlis';
  const tone = getEventTone(event);
  const toneLabel = getEventToneLabel(event);

  return (
    <Card>
      <View style={[styles.eventFrame, styles[`${tone}Frame`]]}>
        <View style={styles.topRow}>
          <View style={styles.identityRow}>
            {event.isAnjumanSchedule ? (
              <View style={styles.logoBadge}>
                <Image source={require('@/assets/images/pasban-logo-white.png')} style={styles.logo} resizeMode="contain" />
              </View>
            ) : null}
            <View style={styles.datePill}>
              <Text style={[styles.dateTime, styles[`${tone}Time`]]}>{event.time || 'TBA'}</Text>
              <Text style={styles.dateText}>{dateLabel || 'Date pending'}</Text>
            </View>
          </View>

          {showScheduleMark ? (
            <View style={[styles.mark, styles[`${tone}Mark`]]}>
              <Text style={[styles.markText, styles[`${tone}MarkText`]]}>{toneLabel}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.contact}>{event.contactName || title}</Text>
        <Text style={styles.meta}>{getEventAudienceLabel(event)} / {event.locationName || 'Location pending'}</Text>
        {event.address ? (
          <Pressable onPress={openMaps}>
            <Text style={styles.address}>{event.address}</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  eventFrame: {
    borderLeftWidth: 4,
    borderRadius: radii.sm,
    margin: -spacing.xs,
    padding: spacing.sm,
  },
  committedFrame: {
    backgroundColor: colors.committedBg,
    borderLeftColor: colors.committedBorder,
  },
  sistersFrame: {
    backgroundColor: colors.sistersBg,
    borderLeftColor: colors.sistersBorder,
  },
  communityFrame: {
    backgroundColor: colors.communityBg,
    borderLeftColor: colors.communityBorder,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: spacing.sm,
  },
  logoBadge: {
    alignItems: 'center',
    backgroundColor: colors.night,
    borderColor: 'rgba(212, 168, 60, .55)',
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  logo: {
    height: 30,
    width: 30,
  },
  datePill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dateTime: {
    color: colors.red,
    fontSize: 15,
    fontWeight: '900',
  },
  committedTime: {
    color: colors.gold,
  },
  sistersTime: {
    color: colors.blue,
  },
  communityTime: {
    color: '#75d39b',
  },
  dateText: {
    color: colors.muted,
    fontSize: 12,
  },
  mark: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  committedMark: {
    backgroundColor: 'rgba(212, 168, 60, .16)',
    borderColor: colors.gold,
  },
  sistersMark: {
    backgroundColor: 'rgba(117, 183, 230, .14)',
    borderColor: colors.blue,
  },
  communityMark: {
    backgroundColor: 'rgba(47, 107, 77, .24)',
    borderColor: colors.communityBorder,
  },
  markText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  committedMarkText: {
    color: colors.gold,
  },
  sistersMarkText: {
    color: colors.blue,
  },
  communityMarkText: {
    color: '#75d39b',
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  contact: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  meta: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  address: {
    color: colors.blue,
    fontSize: 15,
    marginTop: spacing.sm,
  },
});
