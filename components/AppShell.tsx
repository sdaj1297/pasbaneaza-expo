import { PropsWithChildren } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

type AppShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  compact?: boolean;
}>;

export function AppShell({ title, subtitle, compact = false, children }: AppShellProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, compact && styles.compactContent]}>
      <View style={styles.header}>
        <Image source={require('@/assets/images/pasban-logo-white.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.brandCopy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.night,
  },
  content: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    padding: spacing.md,
    paddingBottom: 96,
  },
  compactContent: {
    maxWidth: 820,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.nightLine,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
  },
  logo: {
    height: 42,
    width: 42,
  },
  brandCopy: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
