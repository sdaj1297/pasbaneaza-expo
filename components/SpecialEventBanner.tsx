import { CalendarDays, Radio } from 'lucide-react-native';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing, typography } from '@/constants/theme';
import { SpecialEvent } from '@/data/mock';

type SpecialEventBannerProps = {
  event: SpecialEvent;
};

export function SpecialEventBanner({ event }: SpecialEventBannerProps) {
  return (
    <View style={styles.banner}>
      <View style={styles.markColumn}>
        <Image
          source={require('@/assets/images/pasban-logo-ui-white.png')}
          resizeMode="contain"
          style={styles.mark}
        />
        <Text style={styles.markLabel}>Featured by Pasban-e-Aza</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{event.eyebrow}</Text>
        <Text style={styles.title}>{event.title}</Text>
        <View style={styles.dateRow}>
          <CalendarDays color={colors.goldSoft} size={17} strokeWidth={1.8} />
          <Text style={styles.date}>{event.dateLabel}</Text>
        </View>
        <Text style={styles.description}>{event.description}</Text>
        {event.liveStreamUrl ? (
          <Pressable
            onPress={() => Linking.openURL(event.liveStreamUrl!)}
            style={({ pressed }) => [styles.watchLink, pressed && styles.pressed]}
          >
            <Radio color={colors.onIvory} size={17} strokeWidth={2} />
            <Text style={styles.watchText}>Watch live</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.oxbloodDeep,
    borderColor: colors.oxblood,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  markColumn: {
    alignItems: 'center',
    backgroundColor: colors.oxblood,
    flexBasis: 210,
    flexGrow: 0,
    justifyContent: 'center',
    minHeight: 260,
    padding: spacing.xl,
  },
  mark: {
    height: 112,
    width: 112,
  },
  markLabel: {
    color: colors.ivoryMuted,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.overline,
    lineHeight: 16,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  copy: {
    flex: 1,
    flexBasis: 360,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  eyebrow: {
    color: colors.gold,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ivory,
    fontFamily: fonts.displayMedium,
    fontSize: 38,
    lineHeight: 42,
    marginTop: spacing.sm,
  },
  dateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  date: {
    color: colors.goldSoft,
    fontFamily: fonts.bodyBold,
    fontSize: typography.body,
  },
  description: {
    color: colors.ivoryMuted,
    fontFamily: fonts.body,
    fontSize: typography.body,
    lineHeight: 23,
    marginTop: spacing.md,
    maxWidth: 720,
  },
  watchLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.ivory,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  watchText: {
    color: colors.onIvory,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ translateY: 1 }],
  },
});
