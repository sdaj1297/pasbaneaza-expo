import { ImageBackground, Linking, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { colors, radii, spacing } from '@/constants/theme';
import { SpecialEvent } from '@/data/mock';

type SpecialEventBannerProps = {
  event: SpecialEvent;
};

export function SpecialEventBanner({ event }: SpecialEventBannerProps) {
  return (
    <ImageBackground source={require('@/assets/images/pasban-logo-black.png')} resizeMode="cover" imageStyle={styles.image}>
      <View style={styles.banner}>
        <Text style={styles.eyebrow}>{event.eyebrow}</Text>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.date}>{event.dateLabel}</Text>
        <Text style={styles.description}>{event.description}</Text>
        <View style={styles.actions}>
          <ActionButton onPress={() => event.liveStreamUrl && Linking.openURL(event.liveStreamUrl)}>Watch Live</ActionButton>
          <ActionButton variant="lightOutline">View Flyer</ActionButton>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  image: {
    opacity: 0.18,
  },
  banner: {
    backgroundColor: 'rgba(6, 5, 5, .92)',
    borderColor: 'rgba(217, 173, 67, .45)',
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ivory,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 39,
    marginTop: spacing.sm,
  },
  date: {
    color: colors.gold,
    fontSize: 17,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  description: {
    color: '#dfd5c0',
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.md,
    maxWidth: 720,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
