import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  Bell,
  CalendarPlus,
  Camera,
  Globe2,
  HandHeart,
  MessageCircle,
  Play,
  Users,
} from 'lucide-react-native';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { AppShell } from '@/components/AppShell';
import { FormPicker } from '@/components/FormPicker';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';
import { socialLinks } from '@/data/mock';
import { useResponsiveWidth } from '@/hooks/useResponsiveWidth';
import { PublicSubmissionType, submitPublicForm } from '@/lib/api';
import {
  anjumanRequestOptions,
  buildDateOptions,
  buildTimeOptions,
  eventAudienceOptions,
} from '@/lib/eventFormOptions';

const signupTypes: {
  type: PublicSubmissionType;
  title: string;
  description: string;
  icon: typeof Bell;
}[] = [
  {
    type: 'event',
    title: 'Submit an event',
    description: 'Send a majlis or community program for review.',
    icon: CalendarPlus,
  },
  {
    type: 'reminder',
    title: 'Reminders',
    description: 'Receive program and livestream updates.',
    icon: Bell,
  },
  {
    type: 'membership',
    title: 'Membership',
    description: 'Join or update your family membership.',
    icon: Users,
  },
  {
    type: 'volunteer',
    title: 'Volunteer',
    description: 'Help with programs, media, or logistics.',
    icon: HandHeart,
  },
  {
    type: 'contact',
    title: 'Contact Pasban',
    description: 'Send a question or note to the team.',
    icon: MessageCircle,
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
  eventAudience: '',
  requestsAnjuman: '',
};

type FormState = typeof initialForm;

export default function ConnectScreen() {
  const params = useLocalSearchParams<{ intent?: string }>();
  const width = useResponsiveWidth();
  const compact = width < 700;
  const [selectedType, setSelectedType] = useState<PublicSubmissionType>('reminder');
  const [form, setForm] = useState<FormState>(initialForm);
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dateOptions = useMemo(() => [{ label: 'Select date', value: '' }, ...buildDateOptions()], []);
  const timeOptions = useMemo(
    () => [{ label: 'Select time', value: '' }, ...buildTimeOptions().filter((option) => option.value)],
    [],
  );
  const publicAudienceOptions = useMemo(
    () => [{ label: 'Select event audience', value: '' }, ...eventAudienceOptions],
    [],
  );
  const publicAnjumanOptions = useMemo(
    () => [{ label: 'Select Anjuman participation', value: '' }, ...anjumanRequestOptions],
    [],
  );
  const selectedPath = signupTypes.find((item) => item.type === selectedType) || signupTypes[0];
  const renderPathItems = (isCompact: boolean) => signupTypes.map((item) => {
    const active = selectedType === item.type;
    const Icon = item.icon;
    return (
      <Pressable
        key={item.type}
        onPress={() => setSelectedType(item.type)}
        style={[
          styles.pathItem,
          isCompact && styles.compactPathItem,
          active && styles.activePathItem,
          active && isCompact && styles.activeCompactPathItem,
        ]}
      >
        <Icon
          color={active ? colors.gold : colors.textSubtle}
          size={isCompact ? 18 : 20}
          strokeWidth={active ? 2.2 : 1.8}
        />
        <View style={styles.pathCopy}>
          <Text style={[styles.pathTitle, active && styles.activePathTitle]}>{item.title}</Text>
          {!isCompact ? <Text style={styles.pathDescription}>{item.description}</Text> : null}
        </View>
      </Pressable>
    );
  });

  useEffect(() => {
    if (params.intent === 'event') setSelectedType('event');
  }, [params.intent]);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async () => {
    setNotice('');

    if (selectedType === 'event') {
      const missingFields = [
        ['Full name', form.name],
        ['Email address', form.email],
        ['Phone number', form.phone],
        ['Event title', form.eventTitle],
        ['Date', form.eventDate],
        ['Time', form.eventTime],
        ['Event address', form.eventAddress],
        ['Event for', form.eventAudience],
        ['Anjuman participation', form.requestsAnjuman],
      ]
        .filter(([, value]) => !String(value || '').trim())
        .map(([field]) => field);

      if (missingFields.length) {
        setNotice(`Please complete: ${missingFields.join(', ')}.`);
        return;
      }
    } else if (!form.name.trim() && !form.email.trim() && !form.phone.trim()) {
      setNotice('Please include at least one contact field so we can follow up.');
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
              requestsAnjuman: form.requestsAnjuman === 'yes',
              addToSchedule: form.requestsAnjuman === 'yes',
              ADDTOSCHD: form.requestsAnjuman === 'yes',
              reviewStatus: 'pending_review',
            }
          : {
              interestType: selectedType,
            },
      });

      setNotice(result.status === 'pending_review'
        ? 'Event submitted for review. It will appear publicly after approval.'
        : 'Submission received. Thank you.');
      setForm(initialForm);
    } catch {
      setNotice('Unable to submit right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell title="Community" subtitle="Events, reminders, membership, volunteering, and contact">
      <View style={styles.connectLayout}>
        <View style={[styles.pathMenu, compact && styles.compactPathMenu]}>
          <Text style={styles.pathEyebrow}>Choose a path</Text>
          {compact ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.compactPathList}
            >
              {renderPathItems(true)}
            </ScrollView>
          ) : (
            <View>{renderPathItems(false)}</View>
          )}

          {!compact ? <View style={styles.socialList}>
            <Text style={styles.pathEyebrow}>Elsewhere</Text>
            {socialLinks.map((link) => {
              const Icon = link.label === 'Instagram' ? Camera : link.label === 'YouTube' ? Play : Globe2;
              return (
                <Pressable key={link.label} onPress={() => Linking.openURL(link.url)} style={styles.socialLink}>
                  <Icon color={colors.muted} size={17} strokeWidth={1.8} />
                  <Text style={styles.socialLabel}>{link.label}</Text>
                </Pressable>
              );
            })}
          </View> : null}
        </View>

        <View style={styles.formSheet}>
          <Text style={styles.formEyebrow}>{selectedPath.title}</Text>
          <Text style={styles.formTitle}>
            {selectedType === 'event' ? 'Add a program to the community calendar' : selectedPath.description}
          </Text>
          <Text style={styles.formIntro}>
            {selectedType === 'event'
              ? 'Submissions remain pending until the Pasban team confirms and publishes them.'
              : 'Share your contact details and the Pasban team will follow up.'}
          </Text>

          <View style={styles.form}>
            <View style={styles.fieldRow}>
              <LabeledInput
                label="Full name"
                required={selectedType === 'event'}
                value={form.name}
                onChangeText={(value) => updateField('name', value)}
              />
              <LabeledInput
                label="Email address"
                required={selectedType === 'event'}
                value={form.email}
                keyboardType="email-address"
                onChangeText={(value) => updateField('email', value)}
              />
            </View>
            <LabeledInput
              label="Phone number"
              required={selectedType === 'event'}
              value={form.phone}
              keyboardType="phone-pad"
              onChangeText={(value) => updateField('phone', value)}
            />

            {selectedType === 'event' ? (
              <>
                <LabeledInput
                  label="Event title"
                  required
                  placeholder="Majlis-e-Aza"
                  value={form.eventTitle}
                  onChangeText={(value) => updateField('eventTitle', value)}
                />
                <View style={styles.fieldRow}>
                  <FormPicker
                    label="Date · required"
                    tone="light"
                    value={form.eventDate}
                    options={dateOptions}
                    onChange={(value) => updateField('eventDate', value)}
                  />
                  <FormPicker
                    label="Time · required"
                    tone="light"
                    value={form.eventTime}
                    options={timeOptions}
                    onChange={(value) => updateField('eventTime', value)}
                  />
                </View>
                <LabeledInput
                  label="Event address"
                  required
                  value={form.eventAddress}
                  onChangeText={(value) => updateField('eventAddress', value)}
                />
                <View style={styles.fieldRow}>
                  <FormPicker
                    label="Event for · required"
                    tone="light"
                    value={form.eventAudience}
                    options={publicAudienceOptions}
                    onChange={(value) => updateField('eventAudience', value)}
                  />
                  <FormPicker
                    label="Anjuman participation · required"
                    tone="light"
                    value={form.requestsAnjuman}
                    options={publicAnjumanOptions}
                    onChange={(value) => updateField('requestsAnjuman', value)}
                  />
                </View>
                <Text style={styles.helperText}>
                  Anjuman participation remains a request until the program director confirms availability.
                </Text>
              </>
            ) : null}

            <LabeledInput
              label={selectedType === 'event' ? 'Additional notes' : 'Notes or interests'}
              placeholder={selectedType === 'event' ? 'Contact person, speaker, flyer link, or other details' : ''}
              value={form.message}
              multiline
              onChangeText={(value) => updateField('message', value)}
            />
          </View>

          <View style={styles.actionRow}>
            <ActionButton disabled={isSubmitting} variant="dark" onPress={submit}>
              {isSubmitting ? 'Submitting...' : selectedType === 'event' ? 'Submit for review' : 'Send'}
            </ActionButton>
            {selectedType !== 'contact' ? (
              <Pressable onPress={() => setSelectedType('contact')} style={styles.contactLink}>
                <Text style={styles.contactLinkText}>Contact the program director</Text>
              </Pressable>
            ) : null}
          </View>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        </View>
      </View>
    </AppShell>
  );
}

function LabeledInput({
  label,
  required = false,
  multiline = false,
  placeholder,
  value,
  keyboardType,
  onChangeText,
}: {
  label: string;
  required?: boolean;
  multiline?: boolean;
  placeholder?: string;
  value: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.inputField}>
      <Text style={styles.inputLabel}>{label}{required ? ' · required' : ''}</Text>
      <TextInput
        placeholder={placeholder || label}
        placeholderTextColor={colors.onIvoryMuted}
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        multiline={multiline}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  connectLayout: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
    marginTop: spacing.xl,
  },
  pathMenu: {
    flexBasis: 280,
    flexGrow: 0,
    flexShrink: 1,
  },
  compactPathMenu: {
    flexBasis: 'auto',
    flexGrow: 1,
    width: '100%',
  },
  compactPathList: {
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  pathEyebrow: {
    color: colors.gold,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  pathItem: {
    alignItems: 'flex-start',
    borderLeftColor: 'transparent',
    borderLeftWidth: 2,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 76,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  compactPathItem: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    borderLeftWidth: 0,
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  activePathItem: {
    backgroundColor: colors.surface,
    borderLeftColor: colors.gold,
  },
  activeCompactPathItem: {
    backgroundColor: 'transparent',
    borderBottomColor: colors.gold,
    borderLeftColor: 'transparent',
  },
  pathCopy: {
    flex: 1,
  },
  pathTitle: {
    color: colors.muted,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.body,
  },
  activePathTitle: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
  },
  pathDescription: {
    color: colors.textSubtle,
    fontFamily: fonts.body,
    fontSize: typography.overline,
    lineHeight: 17,
    marginTop: 3,
  },
  socialList: {
    borderTopColor: colors.borderSoft,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  socialLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 38,
  },
  socialLabel: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.small,
  },
  formSheet: {
    ...shadows.medium,
    backgroundColor: colors.ivory,
    borderRadius: radii.md,
    flex: 1,
    flexBasis: 600,
    minWidth: 0,
    padding: spacing.xl,
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
    fontSize: 34,
    lineHeight: 38,
    marginTop: spacing.xs,
    maxWidth: 620,
  },
  formIntro: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.body,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.sm,
    maxWidth: 620,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  fieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  inputField: {
    flex: 1,
    flexBasis: 220,
    gap: spacing.xs,
  },
  inputLabel: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.bodyBold,
    fontSize: typography.label,
  },
  input: {
    backgroundColor: colors.ivoryRaised,
    borderColor: colors.onIvoryLine,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.onIvory,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  textArea: {
    minHeight: 112,
    textAlignVertical: 'top',
  },
  helperText: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.body,
    fontSize: typography.small,
    lineHeight: 19,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  contactLink: {
    minHeight: 40,
    justifyContent: 'center',
  },
  contactLinkText: {
    color: colors.oxblood,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
  },
  notice: {
    color: colors.oxblood,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.small,
    lineHeight: 19,
    marginTop: spacing.md,
  },
});
