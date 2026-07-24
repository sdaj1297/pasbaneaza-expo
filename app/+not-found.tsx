import { ArrowLeft } from 'lucide-react-native';
import { Link, Stack } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing, typography } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Image
          source={require('@/assets/images/pasban-logo-ui-white.png')}
          resizeMode="contain"
          style={styles.mark}
        />
        <Text style={styles.eyebrow}>Page not found</Text>
        <Text style={styles.title}>This path is not on the schedule.</Text>
        <Text style={styles.body}>
          The page may have moved, or the address may no longer be available.
        </Text>
        <Link href="/" asChild>
          <Pressable style={styles.link}>
            <ArrowLeft color={colors.onIvory} size={18} strokeWidth={2} />
            <Text style={styles.linkText}>Return home</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  mark: {
    height: 96,
    marginBottom: spacing.xl,
    width: 96,
  },
  eyebrow: {
    color: colors.gold,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: 40,
    lineHeight: 44,
    maxWidth: 560,
    textAlign: 'center',
  },
  body: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: typography.body,
    lineHeight: 23,
    marginTop: spacing.sm,
    maxWidth: 480,
    textAlign: 'center',
  },
  link: {
    alignItems: 'center',
    backgroundColor: colors.ivory,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xl,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
  },
  linkText: {
    color: colors.onIvory,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
  },
});
