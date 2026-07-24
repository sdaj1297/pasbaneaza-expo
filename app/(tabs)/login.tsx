import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/Card';
import { colors, spacing } from '@/constants/theme';
import { isAuthEnabled, loginWithEmail, sendLoginReset } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [isBusy, setIsBusy] = useState(false);

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
      const user = await loginWithEmail(email, password);
      setNotice(`Signed in as ${user.displayName}.`);
      router.replace('/admin');
    } catch {
      setNotice('Login failed. Check your email and password, or use password reset.');
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
      setNotice('Unable to send reset email. Confirm the address and try again.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AppShell title="Login" subtitle="Legacy Pasban admin accounts">
      <Card>
        <Text style={styles.lead}>Use the same email and password from the existing Pasban-e-Aza admin website.</Text>
        <View style={styles.form}>
          <TextInput
            placeholder="Email address"
            placeholderTextColor={colors.muted}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={colors.muted}
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
        <View style={styles.actions}>
          <ActionButton onPress={login}>{isBusy ? 'Signing In...' : 'Sign In'}</ActionButton>
          <ActionButton variant="outline" onPress={resetPassword}>Reset Password</ActionButton>
        </View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  lead: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  form: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  notice: {
    color: colors.gold,
    fontWeight: '800',
    marginTop: spacing.md,
  },
});
