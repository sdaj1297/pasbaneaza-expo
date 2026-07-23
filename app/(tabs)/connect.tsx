import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/Card';
import { SectionTitle } from '@/components/SectionTitle';
import { colors, spacing } from '@/constants/theme';
import { socialLinks } from '@/data/mock';

const signupTypes = [
  {
    title: 'Reminders',
    description: 'Receive timely updates for majalis, juloos, livestreams, and special announcements.',
  },
  {
    title: 'Membership',
    description: 'Join the Pasban-e-Aza community list and keep your family contact details current.',
  },
  {
    title: 'Volunteer',
    description: 'Help with programs, media, logistics, setup, cleanup, and community coordination.',
  },
];

export default function ConnectScreen() {
  return (
    <AppShell title="Connect" subtitle="Reminders, membership, volunteering, and social channels">
      <SectionTitle title="Sign Up" />
      <Card>
        <Text style={styles.lead}>Tell us how you want to stay connected. The form below is a prototype and will connect to the API once the backend is ready.</Text>
        <View style={styles.form}>
          <TextInput placeholder="Full name" placeholderTextColor={colors.muted} style={styles.input} />
          <TextInput placeholder="Email address" placeholderTextColor={colors.muted} style={styles.input} keyboardType="email-address" />
          <TextInput placeholder="Phone number" placeholderTextColor={colors.muted} style={styles.input} keyboardType="phone-pad" />
          <TextInput placeholder="Notes or interests" placeholderTextColor={colors.muted} style={[styles.input, styles.textArea]} multiline />
        </View>
        <View style={styles.actionRow}>
          <ActionButton>Submit Interest</ActionButton>
          <ActionButton variant="outline">Contact Program Director</ActionButton>
        </View>
      </Card>

      <SectionTitle title="Choose A Path" />
      <View style={styles.stack}>
        {signupTypes.map((item) => (
          <Card key={item.title}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </Card>
        ))}
      </View>

      <SectionTitle title="Social" />
      <View style={styles.socialGrid}>
        {socialLinks.map((link) => (
          <Pressable key={link.label} onPress={() => Linking.openURL(link.url)} style={styles.socialCard}>
            <Text style={styles.socialTitle}>{link.label}</Text>
            <Text style={styles.socialUrl}>{link.url.replace('https://', '')}</Text>
          </Pressable>
        ))}
      </View>
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  stack: {
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  socialCard: {
    backgroundColor: colors.night,
    borderColor: 'rgba(217, 173, 67, .35)',
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 220,
    padding: spacing.md,
  },
  socialTitle: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: '900',
  },
  socialUrl: {
    color: colors.ivory,
    marginTop: spacing.xs,
  },
});
