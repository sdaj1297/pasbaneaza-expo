import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyRound, Mail } from 'lucide-react-native';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { AppShell } from '@/components/AppShell';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';
import { useResponsiveWidth } from '@/hooks/useResponsiveWidth';
import { isAuthEnabled, loginWithEmail, sendLoginReset, subscribeToAuthState } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const width = useResponsiveWidth();
  const isCompact = width < 700;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => subscribeToAuthState((user) => {
    if (user?.isAdmin) router.replace('/admin');
  }), [router]);

  const login = async () => {
    setNotice('');
    if (!isAuthEnabled()) {
      setNotice('Login is not configured for this environment yet.');
      return;
    }
    if (!email.trim() || !password) {
      setNotice('Enter your email and password.');
      return;
    }
    setIsBusy(true);
    try {
      await loginWithEmail(email, password);
      router.replace('/admin');
    } catch {
      setNotice('Login failed. Check your email and password, or request a reset.');
    } finally {
      setIsBusy(false);
    }
  };

  const resetPassword = async () => {
    setNotice('');
    if (!email.trim()) {
      setNotice('Enter your email first, then request a reset link.');
      return;
    }
    setIsBusy(true);
    try {
      await sendLoginReset(email);
      setNotice('Password reset email sent if this address has access.');
    } catch {
      setNotice('Unable to send the reset email. Confirm the address and try again.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AppShell title="Admin Login" subtitle="Pasban-e-Aza administration" compact>
      <View style={[styles.loginLayout, isCompact && styles.loginLayoutCompact]}>
        <View style={[styles.brandPanel, isCompact && styles.brandPanelCompact]}>
          <Image
            source={require('@/assets/images/pasban-logo-ui-white.png')}
            style={[styles.brandMark, isCompact && styles.brandMarkCompact]}
            resizeMode="contain"
          />
          <Text style={styles.brandPanelTitle}>Community stewardship</Text>
          <Text style={styles.brandPanelText}>
            Use the same account credentials as the existing Pasban-e-Aza administration website.
          </Text>
        </View>

        <View style={[styles.formSheet, isCompact && styles.formSheetCompact]}>
          <Text style={styles.formEyebrow}>Secure access</Text>
          <Text style={styles.formTitle}>Welcome back</Text>
          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <Mail color={colors.onIvoryMuted} size={19} strokeWidth={1.8} />
              <TextInput
                placeholder="Email address"
                placeholderTextColor={colors.onIvoryMuted}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View style={styles.inputWrap}>
              <KeyRound color={colors.onIvoryMuted} size={19} strokeWidth={1.8} />
              <TextInput
                placeholder="Password"
                placeholderTextColor={colors.onIvoryMuted}
                style={styles.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>
          <View style={styles.actions}>
            <ActionButton disabled={isBusy} onPress={login}>
              {isBusy ? 'Signing in...' : 'Sign in'}
            </ActionButton>
            <ActionButton disabled={isBusy} variant="outline" onPress={resetPassword}>
              Reset password
            </ActionButton>
          </View>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  loginLayout: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xl,
  },
  loginLayoutCompact: {
    flexDirection: 'column',
  },
  brandPanel: {
    backgroundColor: colors.oxblood,
    borderBottomLeftRadius: radii.md,
    borderTopLeftRadius: radii.md,
    flex: 1,
    flexBasis: 300,
    justifyContent: 'flex-end',
    minHeight: 430,
    overflow: 'hidden',
    padding: spacing.xl,
  },
  brandPanelCompact: {
    alignItems: 'flex-start',
    borderBottomLeftRadius: 0,
    borderTopRightRadius: radii.md,
    flexBasis: 'auto',
    minHeight: 0,
    padding: spacing.lg,
  },
  brandMark: {
    height: 120,
    marginBottom: spacing.xl,
    width: 120,
  },
  brandMarkCompact: {
    height: 68,
    marginBottom: spacing.md,
    width: 68,
  },
  brandPanelTitle: {
    color: colors.ivory,
    fontFamily: fonts.displayMedium,
    fontSize: 34,
    lineHeight: 38,
  },
  brandPanelText: {
    color: colors.ivoryMuted,
    fontFamily: fonts.body,
    fontSize: typography.body,
    lineHeight: 23,
    marginTop: spacing.sm,
    maxWidth: 360,
  },
  formSheet: {
    ...shadows.medium,
    backgroundColor: colors.ivory,
    borderBottomRightRadius: radii.md,
    borderTopRightRadius: radii.md,
    flex: 1,
    flexBasis: 380,
    justifyContent: 'center',
    minHeight: 430,
    padding: spacing.xl,
  },
  formSheetCompact: {
    borderBottomLeftRadius: radii.md,
    borderTopRightRadius: 0,
    flexBasis: 'auto',
    minHeight: 360,
    padding: spacing.lg,
  },
  formEyebrow: {
    color: colors.oxblood,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  formTitle: {
    color: colors.onIvory,
    fontFamily: fonts.displayMedium,
    fontSize: 38,
    lineHeight: 42,
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  inputWrap: {
    alignItems: 'center',
    backgroundColor: colors.ivoryRaised,
    borderColor: colors.onIvoryLine,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  input: {
    color: colors.onIvory,
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    minHeight: 50,
    paddingVertical: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  notice: {
    color: colors.oxblood,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.small,
    lineHeight: 19,
    marginTop: spacing.md,
  },
});
