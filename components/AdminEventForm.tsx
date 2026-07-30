import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/Card';
import { FormPicker } from '@/components/FormPicker';
import { colors, fonts, radii, spacing, typography } from '@/constants/theme';
import { CommunityEvent } from '@/data/mock';
import {
  buildDateOptions,
  buildTimeOptions,
  eventAudienceOptions,
  eventTypeToAudience,
  SelectOption,
} from '@/lib/eventFormOptions';

const yesNoOptions: SelectOption[] = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
];
const anjumanApprovalOptions: SelectOption[] = [
  { label: 'Not requested', value: 'not_requested' },
  { label: 'Pending review', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Declined', value: 'declined' },
];

export type AdminEventDraft = {
  title: string;
  contactName: string;
  contactPhone: string;
  date: string;
  time: string;
  address: string;
  locationName: string;
  audience: string;
  isAnjumanSchedule: string;
  anjumanApprovalStatus: string;
  isPublished: string;
  isPlaceholder: string;
};

type AdminEventFormProps = {
  disabled?: boolean;
  event: CommunityEvent;
  onSave: (draft: AdminEventDraft) => void;
};

export function AdminEventForm({
  disabled = false,
  event,
  onSave,
}: AdminEventFormProps) {
  const [draft, setDraft] = useState<AdminEventDraft>(() => eventToDraft(event));
  const dateOptions = useMemo(() => buildDateOptions(365), []);
  const timeOptions = useMemo(() => buildTimeOptions(), []);
  const currentDateOptions = ensureOption(dateOptions, draft.date);
  const currentTimeOptions = ensureOption(timeOptions, draft.time || '', draft.time || 'Time TBD');

  useEffect(() => {
    setDraft(eventToDraft(event));
  }, [event]);

  const updateDraft = (field: keyof AdminEventDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  return (
    <Card>
      <View style={styles.formHeader}>
        <View style={styles.formHeaderCopy}>
          <Text style={styles.eventName}>{event.contactName || event.title || 'Majlis'}</Text>
          <Text style={styles.eventMeta}>
            {event.date} / {event.time || 'Time TBD'} / {event.isPlaceholder || event.waitingApproval ? 'Placeholder or pending' : 'Published'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onSave(draft)}
          style={[styles.saveButton, disabled && styles.disabledButton]}
        >
          <Save color={colors.onIvory} size={17} strokeWidth={2.1} />
          <Text style={styles.saveButtonText}>{disabled ? 'Saving…' : 'Save changes'}</Text>
        </Pressable>
      </View>

      <View style={styles.editorGrid}>
        <Field label="Event title">
          <TextInput
            placeholder="Event title"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={draft.title}
            onChangeText={(value) => updateDraft('title', value)}
          />
        </Field>
        <Field label="Contact name">
          <TextInput
            placeholder="Contact name"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={draft.contactName}
            onChangeText={(value) => updateDraft('contactName', value)}
          />
        </Field>
        <Field label="Contact phone">
          <TextInput
            keyboardType="phone-pad"
            placeholder="Contact phone"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={draft.contactPhone}
            onChangeText={(value) => updateDraft('contactPhone', value)}
          />
        </Field>
        <FormPicker layout="grid" label="Date" value={draft.date} options={currentDateOptions} onChange={(value) => updateDraft('date', value)} />
        <FormPicker layout="grid" label="Time" value={draft.time} options={currentTimeOptions} onChange={(value) => updateDraft('time', value)} />
        <FormPicker layout="grid" label="Event For" value={draft.audience} options={eventAudienceOptions} onChange={(value) => updateDraft('audience', value)} />
        <FormPicker layout="grid" label="Anjuman Request" value={draft.anjumanApprovalStatus} options={anjumanApprovalOptions} onChange={(value) => {
          updateDraft('anjumanApprovalStatus', value);
          updateDraft('isAnjumanSchedule', value === 'approved' ? 'yes' : 'no');
        }} />
        <FormPicker layout="grid" label="Published" value={draft.isPublished} options={yesNoOptions} onChange={(value) => updateDraft('isPublished', value)} />
        <FormPicker layout="grid" label="Placeholder" value={draft.isPlaceholder} options={yesNoOptions} onChange={(value) => {
          updateDraft('isPlaceholder', value);
          if (value === 'yes') {
            updateDraft('isPublished', 'no');
            updateDraft('isAnjumanSchedule', 'no');
            updateDraft('anjumanApprovalStatus', 'pending');
          }
        }} />
        <Field label="Location name">
          <TextInput
            placeholder="Location name"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={draft.locationName}
            onChangeText={(value) => updateDraft('locationName', value)}
          />
        </Field>
      </View>

      <Field fullWidth label="Event address">
        <TextInput
          placeholder="Event address"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={draft.address}
          onChangeText={(value) => updateDraft('address', value)}
        />
      </Field>
    </Card>
  );
}

function Field({
  children,
  fullWidth = false,
  label,
}: PropsWithChildren<{ fullWidth?: boolean; label: string }>) {
  return (
    <View style={[styles.field, fullWidth && styles.fullWidthField]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function eventToDraft(event: CommunityEvent): AdminEventDraft {
  return {
    title: event.title || '',
    contactName: event.contactName || '',
    contactPhone: event.contactPhone || '',
    date: event.date || '',
    time: event.time || '',
    address: event.address || '',
    locationName: event.locationName || '',
    audience: eventTypeToAudience(event.type),
    isAnjumanSchedule: event.isAnjumanSchedule ? 'yes' : 'no',
    anjumanApprovalStatus: event.anjumanApprovalStatus
      || (event.isAnjumanSchedule ? 'approved' : event.waitingApproval ? 'pending' : 'not_requested'),
    isPublished: event.isPublished ? 'yes' : 'no',
    isPlaceholder: event.isPlaceholder ? 'yes' : 'no',
  };
}

function ensureOption(options: SelectOption[], value: string, fallbackLabel = value) {
  if (!value || options.some((option) => option.value === value)) return options;
  return [{ label: `${fallbackLabel} / current`, value }, ...options];
}

const styles = StyleSheet.create({
  formHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
  },
  formHeaderCopy: {
    flex: 1,
    minWidth: 240,
  },
  eventName: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: 28,
    lineHeight: 32,
  },
  eventMeta: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: typography.small,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.ivory,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  saveButtonText: {
    color: colors.onIvory,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
  },
  disabledButton: {
    opacity: 0.6,
  },
  editorGrid: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  field: {
    flexBasis: 220,
    flexGrow: 1,
    minWidth: 0,
  },
  fullWidthField: {
    flexBasis: 'auto',
    marginTop: spacing.sm,
    width: '100%',
  },
  fieldLabel: {
    color: colors.muted,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '100%',
  },
});
