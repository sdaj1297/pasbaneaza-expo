import { PropsWithChildren } from 'react';
import { Link, usePathname } from 'expo-router';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

type AppShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  compact?: boolean;
}>;

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/prayer', label: 'Prayer' },
  { href: '/status', label: 'Status' },
  { href: '/connect', label: 'Connect' },
] as const;

export function AppShell({ title, subtitle, compact = false, children }: AppShellProps) {
  const pathname = usePathname();
  const showPageIntro = title !== 'Anjuman Pasban-e-Aza';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, compact && styles.compactContent]}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={require('@/assets/images/pasban-logo-white.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.brandCopy}>
            <Text style={styles.brandTitle}>Anjuman Pasban-e-Aza</Text>
            <Text style={styles.brandSubtitle}>Houston, TX</Text>
          </View>
        </View>

        {Platform.OS === 'web' ? (
          <View style={styles.nav}>
            {navItems.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} asChild>
                  <Pressable style={[styles.navItem, active && styles.activeNavItem]}>
                    <Text style={[styles.navText, active && styles.activeNavText]}>{item.label}</Text>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        ) : null}
      </View>

      {showPageIntro ? (
        <View style={styles.pageIntro}>
          <Text style={styles.pageTitle}>{title}</Text>
          {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}

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
    maxWidth: 1120,
    alignSelf: 'center',
    padding: spacing.md,
    paddingBottom: 96,
  },
  compactContent: {
    maxWidth: 820,
  },
  header: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
    paddingBottom: Platform.OS === 'web' ? 0 : spacing.md,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 56,
    paddingBottom: Platform.OS === 'web' ? spacing.sm : 0,
  },
  logo: {
    height: 44,
    width: 44,
  },
  brandCopy: {
    flex: 1,
  },
  brandTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '900',
  },
  brandSubtitle: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  nav: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  navItem: {
    borderRadius: radii.sm,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  activeNavItem: {
    backgroundColor: colors.surfaceAlt,
  },
  navText: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  activeNavText: {
    color: colors.red,
  },
  pageIntro: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
  },
  pageTitle: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
  },
  pageSubtitle: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: spacing.xs,
  },
});
