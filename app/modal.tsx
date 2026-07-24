import { StatusBar } from 'expo-status-bar';
import { X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing, typography } from '@/constants/theme';

export default function ModalScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.sheet}>
        <Pressable accessibilityLabel="Close" onPress={() => router.back()} style={styles.close}>
          <X color={colors.onIvory} size={21} strokeWidth={2} />
        </Pressable>
        <Text style={styles.eyebrow}>Pasban-e-Aza</Text>
        <Text style={styles.title}>Community information</Text>
        <Text style={styles.body}>
          Updates and details from Anjuman Pasban-e-Aza will appear here.
        </Text>
      </View>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.ivory,
    borderRadius: radii.md,
    maxWidth: 560,
    padding: spacing.xl,
    position: 'relative',
    width: '100%',
  },
  close: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    width: 44,
  },
  eyebrow: {
    color: colors.oxblood,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.onIvory,
    fontFamily: fonts.displayMedium,
    fontSize: 34,
    lineHeight: 38,
    marginTop: spacing.xs,
  },
  body: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.body,
    fontSize: typography.body,
    lineHeight: 23,
    marginTop: spacing.sm,
    maxWidth: 430,
  },
});
