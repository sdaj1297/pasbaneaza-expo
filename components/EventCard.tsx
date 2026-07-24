import { Link } from 'expo-router';
import { ArrowUpRight, MapPin, Pencil } from 'lucide-react-native';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing, typography } from '@/constants/theme';
import { CommunityEvent } from '@/data/mock';
import { getEventAudienceLabel, getEventTone, getEventToneLabel } from '@/lib/eventPresentation';

type EventCardProps = {
  canEdit?: boolean;
  event: CommunityEvent;
  showScheduleMark?: boolean;
  isLast?: boolean;
};

export function EventCard({
  canEdit = false,
  event,
  showScheduleMark = true,
  isLast = false,
}: EventCardProps) {
  const tone = getEventTone(event);
  const openMaps = () => {
    if (!event.address) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`);
  };

  return (
    <View style={[styles.row, isLast && styles.lastRow]}>
      <View style={styles.dateColumn}>
        <Text style={styles.time}>{event.time || 'TBA'}</Text>
        <Text style={styles.date}>{event.islamicDate || event.date || 'Date pending'}</Text>
      </View>

      <View style={styles.eventCopy}>
        <View style={styles.metaRow}>
          {showScheduleMark ? (
            <>
              <View style={[styles.toneMark, styles[`${tone}ToneMark`]]} />
              <Text style={[styles.toneText, styles[`${tone}ToneText`]]}>
                {getEventToneLabel(event)}
              </Text>
            </>
          ) : null}
          <Text style={styles.audience}>{getEventAudienceLabel(event)}</Text>
        </View>
        <Text style={styles.host}>{event.contactName || event.title || 'Majlis'}</Text>
        <Text style={styles.title}>{event.title || 'Program details pending'}</Text>
        <View style={styles.locationRow}>
          <MapPin color={colors.onIvoryMuted} size={15} strokeWidth={1.8} />
          <Text style={styles.location}>{event.locationName || event.address || 'Location to be announced'}</Text>
        </View>
        {event.address ? (
          <Pressable onPress={openMaps} style={styles.addressLink}>
            <Text style={styles.address}>{event.address}</Text>
            <ArrowUpRight color={colors.oxblood} size={16} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.actions}>
        {event.isAnjumanSchedule ? (
          <View style={styles.seal}>
            <Image
              source={require('@/assets/images/pasban-logo-ui-black.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        ) : null}
        {canEdit ? (
          <Link href={{ pathname: '/event-editor', params: { eventId: event.id } }} asChild>
            <Pressable
              accessibilityLabel={`Edit ${event.contactName || event.title || 'event'}`}
              style={styles.editButton}
            >
              <Pencil color={colors.oxblood} size={17} strokeWidth={2} />
            </Pressable>
          </Link>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-start',
    borderBottomColor: colors.onIvoryLine,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    minHeight: 156,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  dateColumn: {
    width: 118,
  },
  time: {
    color: colors.onIvory,
    fontFamily: fonts.displaySemibold,
    fontSize: 25,
    lineHeight: 29,
  },
  date: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.small,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  eventCopy: {
    flex: 1,
    minWidth: 210,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  toneMark: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  committedToneMark: {
    backgroundColor: colors.goldDark,
  },
  sistersToneMark: {
    backgroundColor: '#397994',
  },
  communityToneMark: {
    backgroundColor: '#3e7659',
  },
  toneText: {
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
  },
  committedToneText: {
    color: colors.goldDark,
  },
  sistersToneText: {
    color: '#397994',
  },
  communityToneText: {
    color: '#3e7659',
  },
  audience: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.overline,
  },
  host: {
    color: colors.onIvory,
    fontFamily: fonts.displaySemibold,
    fontSize: 28,
    lineHeight: 32,
    marginTop: spacing.xs,
  },
  title: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: 2,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  location: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.body,
    fontSize: typography.small,
  },
  addressLink: {
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    maxWidth: 660,
  },
  address: {
    color: colors.oxblood,
    flex: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.small,
    lineHeight: 19,
  },
  seal: {
    alignItems: 'center',
    borderColor: colors.gold,
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  actions: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  editButton: {
    alignItems: 'center',
    borderColor: colors.onIvoryLine,
    borderRadius: 4,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  logo: {
    height: 38,
    width: 38,
  },
});
