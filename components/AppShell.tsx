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
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
    padding: spacing.md,
    paddingBottom: 96,
  },
  compactContent: {
    maxWidth: 820,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.night,
    borderColor: 'rgba(217, 173, 67, .32)',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    paddingVertical: spacing.lg,
  },
  logo: {
    width: 92,
    height: 92,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.ivory,
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#d7c9aa',
    fontSize: 16,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
