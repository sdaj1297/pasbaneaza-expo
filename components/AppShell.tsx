import { PropsWithChildren, useEffect, useState } from 'react';
import { Href, Link, usePathname } from 'expo-router';
import {
  CalendarDays,
  CircleUserRound,
  Home,
  List,
  Menu,
  Plus,
  Radio,
} from 'lucide-react-native';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, fonts, radii, spacing, typography } from '@/constants/theme';
import { useResponsiveWidth } from '@/hooks/useResponsiveWidth';
import { AuthUser, subscribeToAuthState } from '@/lib/auth';

type AppShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  compact?: boolean;
}>;

type NavItem = {
  href: Href;
  label: string;
  matchPath?: string;
};

const desktopNav: NavItem[] = [
  { href: '/events', label: 'Schedule' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/status', label: 'Live Status' },
  { href: '/prayer', label: 'Prayer' },
  { href: '/connect', label: 'Community' },
];

const mobileNav = [
  { href: '/' as Href, label: 'Home', icon: Home },
  { href: '/events' as Href, label: 'Schedule', icon: List },
  { href: '/calendar' as Href, label: 'Calendar', icon: CalendarDays },
  { href: '/status' as Href, label: 'Status', icon: Radio },
  { href: '/connect' as Href, label: 'More', icon: Menu },
];

export function AppShell({ title, subtitle, compact = false, children }: AppShellProps) {
  const pathname = usePathname();
  const width = useResponsiveWidth();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const isCompactWeb = Platform.OS === 'web' && width < 820;
  const showPageIntro = title !== 'Anjuman Pasban-e-Aza';
  const accountHref: Href = authUser?.isAdmin ? '/admin' : '/login';
  const accountLabel = authUser?.isAdmin ? 'Admin' : 'Login';

  useEffect(() => subscribeToAuthState(setAuthUser), []);

  return (
    <View testID={`app-shell-${Math.round(width)}`} style={styles.shell}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          compact && styles.compactContent,
          isCompactWeb && styles.mobileWebContent,
        ]}
      >
        <View style={styles.header}>
          <Link href="/" asChild>
            <Pressable style={styles.brand}>
              <View style={styles.brandMark}>
                <Image
                  source={require('@/assets/images/pasban-logo-ui-white.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.brandCopy}>
                <Text style={styles.brandTitle}>Pasban-e-Aza</Text>
                <Text style={styles.brandSubtitle}>Anjuman · Houston</Text>
              </View>
            </Pressable>
          </Link>

          {Platform.OS === 'web' && !isCompactWeb ? (
            <View style={styles.desktopNav}>
              {desktopNav.map((item) => {
                const matchPath = item.matchPath || String(item.href);
                const active = pathname.startsWith(matchPath);
                return (
                  <Link key={String(item.href)} href={item.href} asChild>
                    <Pressable style={styles.navItem}>
                      <Text style={[styles.navText, active && styles.activeNavText]}>{item.label}</Text>
                      {active ? <View style={styles.navIndicator} /> : null}
                    </Pressable>
                  </Link>
                );
              })}
              <Link href="/connect?intent=event" asChild>
                <Pressable style={styles.submitNav}>
                  <Plus color={colors.onIvory} size={16} strokeWidth={2.2} />
                  <Text style={styles.submitNavText}>Submit</Text>
                </Pressable>
              </Link>
              <Link href={accountHref} asChild>
                <Pressable accessibilityLabel={accountLabel} style={styles.accountButton}>
                  <CircleUserRound color={colors.muted} size={21} strokeWidth={1.8} />
                </Pressable>
              </Link>
            </View>
          ) : (
            <Link href={accountHref} asChild>
              <Pressable accessibilityLabel={accountLabel} style={styles.accountButton}>
                <CircleUserRound color={colors.muted} size={22} strokeWidth={1.8} />
              </Pressable>
            </Link>
          )}
        </View>

        {showPageIntro ? (
          <View style={styles.pageIntro}>
            <Text style={styles.pageEyebrow}>Pasban-e-Aza · Houston</Text>
            <Text style={styles.pageTitle}>{title}</Text>
            {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
          </View>
        ) : null}

        {children}
      </ScrollView>

      {isCompactWeb ? (
        <View style={styles.mobileNav}>
          {mobileNav.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(String(item.href));
            const Icon = item.icon;
            return (
              <Link key={String(item.href)} href={item.href} asChild>
                <Pressable accessibilityLabel={item.label} style={styles.mobileNavItem}>
                  <Icon
                    color={active ? colors.gold : colors.textSubtle}
                    size={21}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  <Text style={[styles.mobileNavLabel, active && styles.mobileNavLabelActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  screen: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 1240,
    paddingBottom: 96,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  compactContent: {
    maxWidth: 900,
  },
  mobileWebContent: {
    paddingBottom: 112,
    paddingHorizontal: spacing.md,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 80,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 60,
  },
  brandMark: {
    alignItems: 'center',
    height: 54,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 54,
  },
  logo: {
    height: 54,
    width: 54,
  },
  brandCopy: {
    gap: 1,
  },
  brandTitle: {
    color: colors.ink,
    fontFamily: fonts.displaySemibold,
    fontSize: 24,
    lineHeight: 27,
  },
  brandSubtitle: {
    color: colors.textSubtle,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.overline,
  },
  desktopNav: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    position: 'relative',
  },
  navText: {
    color: colors.muted,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.small,
  },
  activeNavText: {
    color: colors.ink,
  },
  navIndicator: {
    backgroundColor: colors.gold,
    bottom: 3,
    height: 2,
    left: spacing.sm,
    position: 'absolute',
    right: spacing.sm,
  },
  submitNav: {
    alignItems: 'center',
    backgroundColor: colors.ivory,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  submitNavText: {
    color: colors.onIvory,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
  },
  accountButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  pageIntro: {
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xl,
  },
  pageEyebrow: {
    color: colors.gold,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  pageTitle: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: 46,
    lineHeight: 50,
    marginTop: spacing.xs,
  },
  pageSubtitle: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: typography.body,
    lineHeight: 23,
    marginTop: spacing.xs,
    maxWidth: 680,
  },
  mobileNav: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    left: 0,
    minHeight: 72,
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
    position: 'absolute',
    right: 0,
  },
  mobileNavItem: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 56,
  },
  mobileNavLabel: {
    color: colors.textSubtle,
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
  },
  mobileNavLabelActive: {
    color: colors.goldSoft,
  },
});
