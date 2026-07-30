import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  ArrowUpRight,
  Bell,
  CalendarPlus,
  Camera,
  Check,
  Globe2,
  HandHeart,
  MessageCircle,
  Play,
  Users,
} from 'lucide-react-native';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { AppShell } from '@/components/AppShell';
import { FormDatePicker } from '@/components/FormDatePicker';
import { FormPicker } from '@/components/FormPicker';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';
import { socialLinks } from '@/data/mock';
import { useResponsiveWidth } from '@/hooks/useResponsiveWidth';
import { PublicSubmissionType, submitPublicForm } from '@/lib/api';
import {
  anjumanRequestOptions,
  buildTimeOptions,
  eventAudienceOptions,
} from '@/lib/eventFormOptions';

const WHATSAPP_ANNOUNCEMENTS_URL = 'https://chat.whatsapp.com/I0PxdtZt9x1Bg3QN9btF9M?s=cl&p=i&ilr=4&amv=0';

const signupTypes: {
  type: PublicSubmissionType;
  title: string;
  description: string;
  icon: typeof Bell;
}[] = [
  {
    type: 'event',
    title: 'Add Event',
    description: 'Add a majlis or program to the community calendar.',
    icon: CalendarPlus,
  },
  {
    type: 'reminder',
    title: 'Announcements & Reminders',
    description: 'Join the Pasban WhatsApp announcements group.',
    icon: Bell,
  },
  {
    type: 'membership',
    title: 'Become a Member',
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
  const [reminderConsent, setReminderConsent] = useState(false);
  const [reminderComplete, setReminderComplete] = useState(false);
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
        onPress={() => {
          setSelectedType(item.type);
          setNotice('');
          setReminderConsent(false);
          setReminderComplete(false);
        }}
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
    const requestedType = signupTypes.find((item) => item.type === params.intent)?.type;
    if (requestedType) {
      setSelectedType(requestedType);
      setNotice('');
      setReminderConsent(false);
      setReminderComplete(false);
    }
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
    } else if (selectedType === 'reminder') {
      const missingFields = [
        ['Full name', form.name],
        ['Phone number', form.phone],
      ]
        .filter(([, value]) => !String(value || '').trim())
        .map(([field]) => field);

      if (missingFields.length) {
        setNotice(`Please complete: ${missingFields.join(', ')}.`);
        return;
      }

      if (!reminderConsent) {
        setNotice('Please confirm that you want to receive announcements through the WhatsApp group.');
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
            }
          : selectedType === 'reminder'
            ? {
                interestType: selectedType,
                channel: 'whatsapp',
                whatsappConsent: true,
                consentedAt: new Date().toISOString(),
                inviteRequested: true,
              }
          : {
              interestType: selectedType,
            },
      });

      if (selectedType === 'reminder') {
        setReminderComplete(true);
        setReminderConsent(false);
        setNotice('');
      } else {
        setNotice(
          result.status === 'published_anjuman_pending'
            ? 'Event published to the community calendar. Your Anjuman participation request is awaiting approval.'
            : result.status === 'published'
              ? 'Event published to the community calendar.'
              : result.status === 'pending_review'
                ? 'Event received for review. It will be published after the Pasban team confirms it.'
            : (selectedType === 'membership' || selectedType === 'volunteer') && result.notificationSent === false
              ? `Your ${selectedType === 'membership' ? 'membership request' : 'volunteer signup'} was saved, but the team notification could not be sent. Please contact Pasban if you do not hear from us.`
              : (selectedType === 'membership' || selectedType === 'volunteer') && result.confirmationSent === false && form.email
                ? `Your ${selectedType === 'membership' ? 'membership request' : 'volunteer signup'} was received. The team was notified, but we could not send your confirmation email.`
                : 'Submission received. Thank you.',
        );
      }
      setForm(initialForm);
    } catch (error) {
      setNotice(error instanceof Error && error.message
        ? error.message
        : 'Unable to submit right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell title="Community" subtitle="Events, announcements, membership, volunteering, and contact">
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
              ? 'Your event will appear on the community calendar after submission. Anjuman participation requests require separate approval.'
              : selectedType === 'reminder'
                ? 'Complete this short signup, then join the group to receive Pasban announcements on WhatsApp.'
                : 'Share your contact details and the Pasban team will follow up.'}
          </Text>
          {selectedType === 'event' || (selectedType === 'reminder' && !reminderComplete) ? (
            <Text style={styles.requiredNote}>
              <Text style={styles.requiredMark}>*</Text> Fields marked with an asterisk must be completed.
            </Text>
          ) : null}

          {selectedType === 'reminder' && reminderComplete ? (
            <ReminderSuccess
              onReset={() => {
                setNotice('');
                setReminderConsent(false);
                setReminderComplete(false);
              }}
            />
          ) : (
            <>
              <View style={styles.form}>
                <View style={styles.fieldRow}>
                  <LabeledInput
                    layout="grid"
                    label="Full name"
                    required={selectedType === 'event' || selectedType === 'reminder'}
                    value={form.name}
                    onChangeText={(value) => updateField('name', value)}
                  />
                  <LabeledInput
                    layout="grid"
                    label="Email address"
                    required={selectedType === 'event'}
                    value={form.email}
                    keyboardType="email-address"
                    onChangeText={(value) => updateField('email', value)}
                  />
                </View>
                <LabeledInput
                  label="Phone number"
                  required={selectedType === 'event' || selectedType === 'reminder'}
                  value={form.phone}
                  keyboardType="phone-pad"
                  onChangeText={(value) => updateField('phone', value)}
                />
                {selectedType === 'event' ? (
                  <Text style={styles.helperText}>
                    This number will appear on the public event listing so attendees can contact the host.
                  </Text>
                ) : null}

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
                      <FormDatePicker
                        layout="grid"
                        label="Date"
                        required
                        value={form.eventDate}
                        onChange={(value) => updateField('eventDate', value)}
                      />
                      <FormPicker
                        layout="grid"
                        label="Time"
                        required
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
                        layout="grid"
                        label="Event for"
                        required
                        tone="light"
                        value={form.eventAudience}
                        options={publicAudienceOptions}
                        onChange={(value) => updateField('eventAudience', value)}
                      />
                      <FormPicker
                        layout="grid"
                        label="Anjuman participation"
                        required
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

                {selectedType === 'event' ? (
                  <LabeledInput
                    label="Additional notes"
                    placeholder="Contact person, speaker, flyer link, or other details"
                    value={form.message}
                    multiline
                    onChangeText={(value) => updateField('message', value)}
                  />
                ) : null}
                {selectedType === 'membership' ? (
                  <LabeledInput
                    label="Membership details"
                    value={form.message}
                    multiline
                    onChangeText={(value) => updateField('message', value)}
                  />
                ) : null}
                {selectedType === 'volunteer' ? (
                  <LabeledInput
                    label="How would you like to help?"
                    value={form.message}
                    multiline
                    onChangeText={(value) => updateField('message', value)}
                  />
                ) : null}
                {selectedType === 'contact' ? (
                  <LabeledInput
                    label="Message"
                    value={form.message}
                    multiline
                    onChangeText={(value) => updateField('message', value)}
                  />
                ) : null}

                {selectedType === 'reminder' ? (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: reminderConsent }}
                    onPress={() => setReminderConsent((current) => !current)}
                    style={styles.consentRow}
                  >
                    <View style={[styles.consentBox, reminderConsent && styles.checkedConsentBox]}>
                      {reminderConsent ? <Check color={colors.ivory} size={15} strokeWidth={2.5} /> : null}
                    </View>
                    <Text style={styles.consentText}>
                      I want to receive Pasban-e-Aza announcements through the WhatsApp group and understand that group members may see my phone number.
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.actionRow}>
                <ActionButton disabled={isSubmitting} variant="dark" onPress={submit}>
                  {isSubmitting
                    ? 'Submitting...'
                    : selectedType === 'event'
                      ? 'Publish event'
                      : selectedType === 'reminder'
                        ? 'Continue to WhatsApp'
                        : 'Send'}
                </ActionButton>
                {selectedType !== 'contact' ? (
                  <Pressable
                    onPress={() => {
                      setSelectedType('contact');
                      setNotice('');
                      setReminderConsent(false);
                      setReminderComplete(false);
                    }}
                    style={styles.contactLink}
                  >
                    <Text style={styles.contactLinkText}>Contact the program director</Text>
                  </Pressable>
                ) : null}
              </View>
              {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            </>
          )}
        </View>
      </View>
    </AppShell>
  );
}

function ReminderSuccess({ onReset }: { onReset: () => void }) {
  return (
    <View style={styles.reminderSuccess}>
      <View style={styles.successLabelRow}>
        <View style={styles.successIcon}>
          <Check color={colors.ivory} size={15} strokeWidth={2.5} />
        </View>
        <Text style={styles.successLabel}>Signup saved</Text>
      </View>
      <Text style={styles.successTitle}>Join the announcements group</Text>
      <Text style={styles.successText}>
        Your details and consent have been saved. WhatsApp will ask you to confirm before joining the group.
      </Text>
      <Pressable
        accessibilityHint="Opens the Pasban announcements group in WhatsApp"
        accessibilityLabel="Join Pasban WhatsApp announcements"
        accessibilityRole="link"
        onPress={() => Linking.openURL(WHATSAPP_ANNOUNCEMENTS_URL)}
        style={({ pressed }) => [styles.whatsappButton, pressed && styles.pressedButton]}
      >
        <MessageCircle color={colors.ivory} size={20} strokeWidth={2} />
        <Text style={styles.whatsappButtonText}>Join WhatsApp Announcements</Text>
        <ArrowUpRight color={colors.ivory} size={18} strokeWidth={2} />
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onReset} style={styles.resetSignup}>
        <Text style={styles.resetSignupText}>Use different details</Text>
      </Pressable>
    </View>
  );
}

function LabeledInput({
  label,
  required = false,
  multiline = false,
  placeholder,
  value,
  keyboardType,
  layout = 'stacked',
  onChangeText,
}: {
  label: string;
  required?: boolean;
  multiline?: boolean;
  placeholder?: string;
  value: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  layout?: 'stacked' | 'grid';
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={[styles.inputField, layout === 'grid' && styles.gridInputField]}>
      <Text style={styles.inputLabel}>
        {label}
        {required ? <Text style={styles.requiredMark}> *</Text> : null}
      </Text>
      <TextInput
        accessibilityLabel={`${label}${required ? ', required' : ''}`}
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
  requiredNote: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.overline,
    lineHeight: 17,
    marginTop: spacing.sm,
  },
  requiredMark: {
    color: colors.oxblood,
    fontFamily: fonts.bodyBold,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  fieldRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  inputField: {
    gap: spacing.xs,
    minWidth: 0,
    width: '100%',
  },
  gridInputField: {
    flex: 1,
    flexBasis: 220,
    width: 'auto',
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
  consentRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  consentBox: {
    alignItems: 'center',
    borderColor: colors.onIvoryLine,
    borderRadius: radii.xs,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    marginTop: 1,
    width: 22,
  },
  checkedConsentBox: {
    backgroundColor: colors.oxblood,
    borderColor: colors.oxblood,
  },
  consentText: {
    color: colors.onIvoryMuted,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: typography.small,
    lineHeight: 20,
    maxWidth: 580,
  },
  reminderSuccess: {
    alignItems: 'flex-start',
    marginTop: spacing.xl,
    maxWidth: 620,
  },
  successLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  successIcon: {
    alignItems: 'center',
    backgroundColor: colors.green,
    borderRadius: radii.xs,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  successLabel: {
    color: colors.green,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
  },
  successTitle: {
    color: colors.onIvory,
    fontFamily: fonts.displayMedium,
    fontSize: 30,
    lineHeight: 35,
    marginTop: spacing.md,
  },
  successText: {
    color: colors.onIvoryMuted,
    fontFamily: fonts.body,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  whatsappButton: {
    alignItems: 'center',
    backgroundColor: colors.green,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressedButton: {
    opacity: 0.84,
  },
  whatsappButtonText: {
    color: colors.ivory,
    flexShrink: 1,
    fontFamily: fonts.bodyBold,
    fontSize: typography.body,
  },
  resetSignup: {
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 40,
  },
  resetSignupText: {
    color: colors.oxblood,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
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
