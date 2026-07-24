import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/Card';
import { SectionTitle } from '@/components/SectionTitle';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { socialLinks } from '@/data/mock';
import { PublicSubmissionType, submitPublicForm } from '@/lib/api';

const signupTypes: { type: PublicSubmissionType; title: string; description: string }[] = [
  {
    type: 'event',
    title: 'Submit New Event',
    description: 'Send majlis or community program details for review before they appear publicly.',
  },
  {
    type: 'reminder',
    title: 'Reminders',
    description: 'Receive timely updates for majalis, juloos, livestreams, and special announcements.',
  },
  {
    type: 'membership',
    title: 'Membership',
    description: 'Join the Pasban-e-Aza community list and keep your family contact details current.',
  },
  {
    type: 'volunteer',
    title: 'Volunteer',
    description: 'Help with programs, media, logistics, setup, cleanup, and community coordination.',
  },
  {
    type: 'contact',
    title: 'Contact',
    description: 'Ask a question or send a note to the Pasban team.',
  },
];

const initialForm = {
  name: '',
  email: '',
  phone: '',
  message: '',
  eventTitle: '',
  eventDate: '',
  eventTime: '',
  eventAddress: '',
  eventAudience: 'Family',
};

type FormState = typeof initialForm;

export default function ConnectScreen() {
  const params = useLocalSearchParams<{ intent?: string }>();
  const [selectedType, setSelectedType] = useState<PublicSubmissionType>('reminder');
  const [form, setForm] = useState<FormState>(initialForm);
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (params.intent === 'event') setSelectedType('event');
  }, [params.intent]);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async () => {
    setNotice('');

    if (!form.name.trim() && !form.email.trim() && !form.phone.trim()) {
      setNotice('Please include at least one contact field so we can follow up.');
      return;
    }

    if (selectedType === 'event' && (!form.eventTitle.trim() || !form.eventDate.trim())) {
      setNotice('Please include at least an event title and date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitPublicForm({
        type: selectedType,
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: form.message,
        source: 'website',
        payload: selectedType === 'event'
          ? {
              eventTitle: form.eventTitle,
              eventDate: form.eventDate,
              eventTime: form.eventTime,
              eventAddress: form.eventAddress,
              eventAudience: form.eventAudience,
              reviewStatus: 'pending_review',
            }
          : {
              interestType: selectedType,
            },
      });

      setNotice(result.status === 'pending_review'
        ? 'Event submitted for review. It will not appear publicly until approved.'
        : 'Submission received. Thank you.');
      setForm(initialForm);
    } catch {
      setNotice('Unable to submit right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell title="Connect" subtitle="Reminders, membership, volunteering, event submissions, and social channels">
      <SectionTitle title="Choose A Path" />
      <View style={styles.pathGrid}>
        {signupTypes.map((item) => (
          <Pressable
            key={item.type}
            onPress={() => setSelectedType(item.type)}
            style={selectedType === item.type ? styles.activePathCard : styles.pathCard}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle title={selectedType === 'event' ? 'Submit New Event' : 'Sign Up'} />
      <Card>
        <Text style={styles.lead}>
          {selectedType === 'event'
            ? 'Public event submissions go into pending review first. Once approved, they can appear in the schedule.'
            : 'Tell us how you want to stay connected and someone from the team can follow up.'}
        </Text>

        <View style={styles.form}>
          <TextInput
            placeholder="Full name"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={form.name}
            onChangeText={(value) => updateField('name', value)}
          />
          <TextInput
            placeholder="Email address"
            placeholderTextColor={colors.muted}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(value) => updateField('email', value)}
          />
          <TextInput
            placeholder="Phone number"
            placeholderTextColor={colors.muted}
            style={styles.input}
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(value) => updateField('phone', value)}
          />

          {selectedType === 'event' ? (
            <>
              <TextInput
                placeholder="Event title, e.g. Majlis-e-Aza"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={form.eventTitle}
                onChangeText={(value) => updateField('eventTitle', value)}
              />
              <View style={styles.inlineFields}>
                <TextInput
                  placeholder="Date, e.g. 2026-07-25"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.inlineInput]}
                  value={form.eventDate}
                  onChangeText={(value) => updateField('eventDate', value)}
                />
                <TextInput
                  placeholder="Time, e.g. 7:30 PM"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.inlineInput]}
                  value={form.eventTime}
                  onChangeText={(value) => updateField('eventTime', value)}
                />
              </View>
              <TextInput
                placeholder="Event address"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={form.eventAddress}
                onChangeText={(value) => updateField('eventAddress', value)}
              />
              <View style={styles.audienceRow}>
                {['Family', 'Brothers', 'Sisters'].map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => updateField('eventAudience', item)}
                    style={form.eventAudience === item ? styles.activeAudienceButton : styles.audienceButton}
                  >
                    <Text style={form.eventAudience === item ? styles.activeAudienceText : styles.audienceText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <TextInput
            placeholder={selectedType === 'event' ? 'Additional notes, contact person, speaker, flyer link, etc.' : 'Notes or interests'}
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.textArea]}
            multiline
            value={form.message}
            onChangeText={(value) => updateField('message', value)}
          />
        </View>

        <View style={styles.actionRow}>
          <ActionButton onPress={submit}>{isSubmitting ? 'Submitting...' : selectedType === 'event' ? 'Submit For Review' : 'Submit Interest'}</ActionButton>
          <ActionButton variant="outline" onPress={() => setSelectedType('contact')}>Contact Program Director</ActionButton>
        </View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </Card>

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
  pathGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pathCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: 220,
    flexGrow: 1,
    padding: spacing.md,
  },
  activePathCard: {
    backgroundColor: colors.redDark,
    borderColor: colors.red,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: 220,
    flexGrow: 1,
    padding: spacing.md,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  description: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
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
  inlineFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  inlineInput: {
    flexBasis: 220,
    flexGrow: 1,
  },
  audienceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  audienceButton: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  activeAudienceButton: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  audienceText: {
    color: colors.ink,
    fontWeight: '900',
  },
  activeAudienceText: {
    color: colors.night,
    fontWeight: '900',
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
  notice: {
    color: colors.gold,
    fontWeight: '800',
    marginTop: spacing.md,
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
