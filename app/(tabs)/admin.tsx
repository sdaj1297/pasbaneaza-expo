import { useEffect, useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/Card';
import { FormPicker } from '@/components/FormPicker';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { CommunityEvent, MajlisStatus, StatusItem, statusItems } from '@/data/mock';
import {
  AdminEventReviewInput,
  AdminEventSubmission,
  createEventFromSubmission,
  fetchAdminEvents,
  fetchAdminEventSubmissions,
  fetchIslamicCalendarYears,
  fetchTodayMajlis,
  updateAdminEvent,
  updateEventSubmissionStatus,
  updateIslamicMonthLength,
  updateMajlisStatus,
} from '@/lib/api';
import { getHoustonDate, IslamicCalendarYear } from '@/lib/calendarUtils';
import {
  audienceToEventType,
  buildDateOptions,
  buildTimeOptions,
  eventAudienceOptions,
  eventTypeToAudience,
  SelectOption,
} from '@/lib/eventFormOptions';
import { AuthUser, logout, subscribeToAuthState } from '@/lib/auth';

const statuses: MajlisStatus[] = ['Pending', 'En Route', 'Started', 'Completed', 'Delayed', 'Skipped'];
const adminSections = ['Events', 'Status', 'Calendar'] as const;
const yesNoOptions: SelectOption[] = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
];

type AdminSection = (typeof adminSections)[number];
type EventDraft = {
  title: string;
  contactName: string;
  date: string;
  time: string;
  address: string;
  locationName: string;
  audience: string;
  isAnjumanSchedule: string;
  isPublished: string;
  waitingApproval: string;
  isPlaceholder: string;
};

export default function AdminScreen() {
  const [section, setSection] = useState<AdminSection>('Events');
  const [items, setItems] = useState<StatusItem[]>(statusItems);
  const [calendarYears, setCalendarYears] = useState<IslamicCalendarYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [calendarNotice, setCalendarNotice] = useState('');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [eventSubmissions, setEventSubmissions] = useState<AdminEventSubmission[]>([]);
  const [adminEvents, setAdminEvents] = useState<CommunityEvent[]>([]);
  const [eventsNotice, setEventsNotice] = useState('');
  const [eventsBusy, setEventsBusy] = useState(false);
  const dateOptions = useMemo(() => buildDateOptions(365), []);
  const timeOptions = useMemo(() => buildTimeOptions(), []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      setAuthUser(user);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authUser?.isAdmin) return;

    fetchTodayMajlis().then(setItems);
    fetchIslamicCalendarYears().then((years) => {
      const sorted = [...years].sort((a, b) => b.year - a.year);
      setCalendarYears(sorted);
      setSelectedYear((current) => current || sorted.find((year) => year.firstDate <= getHoustonDate())?.year || sorted[0]?.year || null);
    });
    refreshEvents();
  }, [authUser?.isAdmin]);

  const activeCalendarYear = useMemo(
    () => calendarYears.find((year) => year.year === selectedYear) || calendarYears[0],
    [calendarYears, selectedYear],
  );

  const pendingSubmissions = eventSubmissions.filter((submission) => submission.status === 'pending_review');
  const reviewedSubmissions = eventSubmissions.filter((submission) => submission.status !== 'pending_review').slice(0, 8);

  const refreshEvents = async () => {
    setEventsBusy(true);
    try {
      const [submissions, events] = await Promise.all([
        fetchAdminEventSubmissions(),
        fetchAdminEvents(),
      ]);
      setEventSubmissions(submissions);
      setAdminEvents(events);
    } finally {
      setEventsBusy(false);
    }
  };

  const setStatus = async (item: StatusItem, status: MajlisStatus) => {
    const stage = status === 'Started' ? item.stage || 'Hadis e Kisa' : undefined;
    setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, status, stage } : currentItem));
    const updatedItems = await updateMajlisStatus(item.id, item.date, status, stage);
    setItems(updatedItems);
  };

  const setMonthLength = async (year: IslamicCalendarYear, monthIndex: number, length: 29 | 30) => {
    setCalendarNotice('');
    setCalendarYears((current) => current.map((item) => item.year === year.year ? {
      ...item,
      months: item.months.map((month) => month.index === monthIndex ? { ...month, length } : month),
    } : item));

    try {
      const updatedYear = await updateIslamicMonthLength(year.year, monthIndex, length);
      setCalendarYears((current) => current.map((item) => item.year === updatedYear.year ? updatedYear : item));
      setCalendarNotice(`Updated ${updatedYear.year} ${updatedYear.months.find((month) => month.index === monthIndex)?.name || 'month'} to ${length} days.`);
    } catch {
      setCalendarNotice('Unable to update the month length. Please try again.');
      fetchIslamicCalendarYears().then(setCalendarYears);
    }
  };

  const handleSubmissionAction = async (
    submission: AdminEventSubmission,
    action: 'create' | 'approve' | 'dismiss',
    review?: AdminEventReviewInput,
  ) => {
    setEventsNotice('');
    setEventsBusy(true);

    try {
      if (action === 'dismiss') {
        await updateEventSubmissionStatus(submission.id, 'dismissed');
        setEventsNotice('Submission dismissed.');
      } else {
        const nextReview = action === 'approve'
          ? {
              isAnjumanSchedule: review?.isAnjumanSchedule ?? true,
              isPublished: true,
              waitingApproval: false,
              isPlaceholder: false,
            }
          : review;

        if (!nextReview) throw new Error('Missing review decision.');

        await createEventFromSubmission(submission, nextReview);
        setEventsNotice(nextReview.waitingApproval || nextReview.isPlaceholder
          ? 'Reviewed event created as a placeholder or pending item.'
          : 'Event approved and published.');
      }
      await refreshEvents();
    } catch {
      setEventsNotice('Unable to update this submission. Please try again.');
    } finally {
      setEventsBusy(false);
    }
  };

  const saveEvent = async (event: CommunityEvent, draft: EventDraft) => {
    setEventsNotice('');
    setEventsBusy(true);

    try {
      await updateAdminEvent(event.id, event.date, {
        title: draft.title,
        contactName: draft.contactName,
        date: draft.date,
        time: draft.time,
        address: draft.address,
        locationName: draft.locationName,
        type: audienceToEventType(draft.audience),
        isAnjumanSchedule: draft.isAnjumanSchedule === 'yes',
        isPublished: draft.isPublished === 'yes',
        waitingApproval: draft.waitingApproval === 'yes',
        isPlaceholder: draft.isPlaceholder === 'yes',
      });
      setEventsNotice('Event saved.');
      await refreshEvents();
    } catch {
      setEventsNotice('Unable to save event. Please try again.');
    } finally {
      setEventsBusy(false);
    }
  };

  return (
    <AppShell title="Admin" subtitle="Review submissions, maintain event data, update status, and adjust the Islamic calendar">
      <View style={styles.stack}>
        {!authReady ? (
          <Card>
            <Text style={styles.sectionTitle}>Checking Login</Text>
            <Text style={styles.sectionMeta}>One moment while we check your admin session.</Text>
          </Card>
        ) : null}

        {authReady && !authUser?.isAdmin ? (
          <Card>
            <Text style={styles.sectionTitle}>Admin Login Required</Text>
            <Text style={styles.sectionMeta}>Use a legacy Pasban admin account to review events, update status controls, and adjust Islamic calendar month lengths.</Text>
            <Link href="/login" asChild>
              <Pressable style={styles.loginButton}>
                <Text style={styles.loginButtonText}>Login</Text>
              </Pressable>
            </Link>
          </Card>
        ) : null}

        {authUser?.isAdmin ? (
          <>
            <Card>
              <View style={styles.signedInRow}>
                <View style={styles.signedInCopy}>
                  <Text style={styles.sectionTitle}>Signed In</Text>
                  <Text style={styles.sectionMeta}>{authUser.displayName} / {authUser.adminType || 'Admin'}</Text>
                </View>
                <Pressable onPress={logout} style={styles.logoutButton}>
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </Pressable>
              </View>
            </Card>

            <View style={styles.sectionTabs}>
              {adminSections.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setSection(item)}
                  style={section === item ? styles.activeSectionTab : styles.sectionTab}
                >
                  <Text style={section === item ? styles.activeSectionText : styles.sectionText}>{item}</Text>
                </Pressable>
              ))}
            </View>

            {section === 'Events' ? (
              <>
                <Card>
                  <View style={styles.panelHeader}>
                    <View style={styles.panelCopy}>
                      <Text style={styles.sectionTitle}>Event Review</Text>
                      <Text style={styles.sectionMeta}>Pending public submissions can become hidden placeholders or published schedule entries.</Text>
                    </View>
                    <Pressable onPress={refreshEvents} style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>{eventsBusy ? 'Refreshing...' : 'Refresh'}</Text>
                    </Pressable>
                  </View>
                  {eventsNotice ? <Text style={styles.notice}>{eventsNotice}</Text> : null}
                </Card>

                {!pendingSubmissions.length ? (
                  <Card>
                    <Text style={styles.name}>No pending event submissions</Text>
                    <Text style={styles.meta}>New public event requests will appear here before they are approved.</Text>
                  </Card>
                ) : null}

                {pendingSubmissions.map((submission) => (
                  <SubmissionCard
                    key={submission.id}
                    submission={submission}
                    disabled={eventsBusy}
                    onAction={handleSubmissionAction}
                  />
                ))}

                <Card>
                  <Text style={styles.sectionTitle}>Upcoming Events</Text>
                  <Text style={styles.sectionMeta}>Edit published events and admin placeholders. Waiting approval items stay hidden from public event lists.</Text>
                </Card>

                {adminEvents.map((event) => (
                  <AdminEventEditor
                    key={event.id}
                    event={event}
                    dateOptions={dateOptions}
                    timeOptions={timeOptions}
                    disabled={eventsBusy}
                    onSave={saveEvent}
                  />
                ))}

                {reviewedSubmissions.length ? (
                  <Card>
                    <Text style={styles.sectionTitle}>Recently Reviewed</Text>
                    <View style={styles.reviewedStack}>
                      {reviewedSubmissions.map((submission) => (
                        <Text key={submission.id} style={styles.meta}>
                          {payloadText(submission.payload, 'eventDate') || 'Date pending'} / {payloadText(submission.payload, 'eventTitle') || 'Majlis'} / {submission.status}
                        </Text>
                      ))}
                    </View>
                  </Card>
                ) : null}
              </>
            ) : null}

            {section === 'Status' ? (
              <>
                <Card>
                  <Text style={styles.sectionTitle}>Majlis Status</Text>
                  <Text style={styles.sectionMeta}>Open community controls for today's Anjuman schedule.</Text>
                </Card>

                {!items.length ? (
                  <Card>
                    <Text style={styles.name}>No Anjuman majalis today</Text>
                    <Text style={styles.meta}>Status controls will appear automatically when today has committed Anjuman schedule events.</Text>
                  </Card>
                ) : null}

                {items.map((item) => (
                  <Card key={item.id}>
                    <Text style={styles.name}>{item.contactName || item.title || 'Majlis'}</Text>
                    <Text style={styles.meta}>{item.time || 'TBA'} / {item.title || 'Program details pending'}</Text>
                    <View style={styles.buttons}>
                      {statuses.map((status) => (
                        <Pressable key={status} onPress={() => setStatus(item, status)} style={[styles.button, item.status === status && styles.activeButton]}>
                          <Text style={[styles.buttonText, item.status === status && styles.activeButtonText]}>{status}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {item.stage ? <Text style={styles.stage}>Stage: {item.stage}</Text> : null}
                  </Card>
                ))}
              </>
            ) : null}

            {section === 'Calendar' ? (
              <Card>
                <Text style={styles.sectionTitle}>Islamic Month Lengths</Text>
                <Text style={styles.sectionMeta}>Adjust the official Pasban calendar after moonsighting. Each month must be 29 or 30 days.</Text>

                <View style={styles.yearRow}>
                  {calendarYears.slice(0, 6).map((year) => (
                    <Pressable
                      key={year.year}
                      onPress={() => setSelectedYear(year.year)}
                      style={selectedYear === year.year ? styles.activeYearButton : styles.yearButton}
                    >
                      <Text style={selectedYear === year.year ? styles.activeYearText : styles.yearText}>{year.year}</Text>
                    </Pressable>
                  ))}
                </View>

                {activeCalendarYear ? (
                  <View style={styles.monthStack}>
                    <Text style={styles.meta}>Lunar year starts {activeCalendarYear.firstDate}</Text>
                    {activeCalendarYear.months.map((month) => (
                      <View key={month.key} style={styles.monthRow}>
                        <View style={styles.monthNameBlock}>
                          <Text style={styles.monthName}>{month.name}</Text>
                          <Text style={styles.monthMeta}>Month {month.index}</Text>
                        </View>
                        <View style={styles.lengthButtons}>
                          {[29, 30].map((length) => (
                            <Pressable
                              key={length}
                              onPress={() => setMonthLength(activeCalendarYear, month.index, length as 29 | 30)}
                              style={month.length === length ? styles.activeLengthButton : styles.lengthButton}
                            >
                              <Text style={month.length === length ? styles.activeLengthText : styles.lengthText}>{length}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.meta}>Islamic calendar data has not loaded yet.</Text>
                )}

                {calendarNotice ? <Text style={styles.calendarNotice}>{calendarNotice}</Text> : null}
              </Card>
            ) : null}
          </>
        ) : null}
      </View>
    </AppShell>
  );
}

function SubmissionCard({
  submission,
  disabled,
  onAction,
}: {
  submission: AdminEventSubmission;
  disabled: boolean;
  onAction: (submission: AdminEventSubmission, action: 'create' | 'approve' | 'dismiss', review?: AdminEventReviewInput) => void;
}) {
  const payload = submission.payload || {};
  const requestsAnjuman = Boolean(payload.requestsAnjuman || payload.addToSchedule || payload.ADDTOSCHD);
  const [reviewDraft, setReviewDraft] = useState({
    isAnjumanSchedule: requestsAnjuman ? 'yes' : 'no',
    isPublished: 'yes',
    waitingApproval: 'yes',
    isPlaceholder: 'yes',
  });

  const updateReviewDraft = (field: keyof typeof reviewDraft, value: string) => {
    setReviewDraft((current) => ({ ...current, [field]: value }));
  };

  const review: AdminEventReviewInput = {
    isAnjumanSchedule: reviewDraft.isAnjumanSchedule === 'yes',
    isPublished: reviewDraft.isPublished === 'yes',
    waitingApproval: reviewDraft.waitingApproval === 'yes',
    isPlaceholder: reviewDraft.isPlaceholder === 'yes',
  };

  return (
    <Card>
      <View style={styles.submissionHeader}>
        <View style={styles.submissionCopy}>
          <Text style={styles.name}>{payloadText(payload, 'eventTitle') || 'Majlis submission'}</Text>
          <Text style={styles.meta}>{payloadText(payload, 'eventDate') || 'Date pending'} / {payloadText(payload, 'eventTime') || 'Time TBD'}</Text>
        </View>
        <View style={requestsAnjuman ? styles.anjumamBadge : styles.communityBadge}>
          <Text style={styles.badgeText}>{requestsAnjuman ? 'Anjuman requested' : 'Community listing'}</Text>
        </View>
      </View>
      <Text style={styles.meta}>{submission.name || 'Contact pending'} / {submission.phone || submission.email || 'No contact detail'}</Text>
      {payloadText(payload, 'eventAddress') ? <Text style={styles.address}>{payloadText(payload, 'eventAddress')}</Text> : null}
      {submission.message ? <Text style={styles.message}>{submission.message}</Text> : null}

      <View style={styles.reviewGrid}>
        <FormPicker
          label="Add To Anjuman Schedule"
          value={reviewDraft.isAnjumanSchedule}
          options={yesNoOptions}
          onChange={(value) => updateReviewDraft('isAnjumanSchedule', value)}
        />
        <FormPicker
          label="Published"
          value={reviewDraft.isPublished}
          options={yesNoOptions}
          onChange={(value) => updateReviewDraft('isPublished', value)}
        />
        <FormPicker
          label="Waiting For Approval"
          value={reviewDraft.waitingApproval}
          options={yesNoOptions}
          onChange={(value) => updateReviewDraft('waitingApproval', value)}
        />
        <FormPicker
          label="Placeholder"
          value={reviewDraft.isPlaceholder}
          options={yesNoOptions}
          onChange={(value) => updateReviewDraft('isPlaceholder', value)}
        />
      </View>

      <View style={styles.buttons}>
        <Pressable disabled={disabled} onPress={() => onAction(submission, 'create', review)} style={styles.button}>
          <Text style={styles.buttonText}>Create With Settings</Text>
        </Pressable>
        <Pressable disabled={disabled} onPress={() => onAction(submission, 'approve', review)} style={styles.activeButton}>
          <Text style={styles.activeButtonText}>Quick Approve</Text>
        </Pressable>
        <Pressable disabled={disabled} onPress={() => onAction(submission, 'dismiss')} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>Dismiss</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function AdminEventEditor({
  event,
  dateOptions,
  timeOptions,
  disabled,
  onSave,
}: {
  event: CommunityEvent;
  dateOptions: SelectOption[];
  timeOptions: SelectOption[];
  disabled: boolean;
  onSave: (event: CommunityEvent, draft: EventDraft) => void;
}) {
  const [draft, setDraft] = useState<EventDraft>(() => eventToDraft(event));
  const currentDateOptions = ensureOption(dateOptions, draft.date);
  const currentTimeOptions = ensureOption(timeOptions, draft.time || '', draft.time || 'Time TBD');

  useEffect(() => {
    setDraft(eventToDraft(event));
  }, [event]);

  const updateDraft = (field: keyof EventDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  return (
    <Card>
      <View style={styles.editorHeader}>
        <View style={styles.editorCopy}>
          <Text style={styles.name}>{event.contactName || event.title || 'Majlis'}</Text>
          <Text style={styles.meta}>
            {event.date} / {event.time || 'Time TBD'} / {event.isPlaceholder || event.waitingApproval ? 'Placeholder or pending' : 'Published'}
          </Text>
        </View>
        <Pressable disabled={disabled} onPress={() => onSave(event, draft)} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>{disabled ? 'Saving...' : 'Save'}</Text>
        </Pressable>
      </View>

      <View style={styles.editorGrid}>
        <TextInput
          placeholder="Event title"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={draft.title}
          onChangeText={(value) => updateDraft('title', value)}
        />
        <TextInput
          placeholder="Contact name"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={draft.contactName}
          onChangeText={(value) => updateDraft('contactName', value)}
        />
        <FormPicker label="Date" value={draft.date} options={currentDateOptions} onChange={(value) => updateDraft('date', value)} />
        <FormPicker label="Time" value={draft.time} options={currentTimeOptions} onChange={(value) => updateDraft('time', value)} />
        <FormPicker label="Event For" value={draft.audience} options={eventAudienceOptions} onChange={(value) => updateDraft('audience', value)} />
        <FormPicker label="Add To Anjuman Schedule" value={draft.isAnjumanSchedule} options={yesNoOptions} onChange={(value) => updateDraft('isAnjumanSchedule', value)} />
        <FormPicker label="Published" value={draft.isPublished} options={yesNoOptions} onChange={(value) => updateDraft('isPublished', value)} />
        <FormPicker label="Waiting For Approval" value={draft.waitingApproval} options={yesNoOptions} onChange={(value) => updateDraft('waitingApproval', value)} />
        <FormPicker label="Placeholder" value={draft.isPlaceholder} options={yesNoOptions} onChange={(value) => updateDraft('isPlaceholder', value)} />
        <TextInput
          placeholder="Location name"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={draft.locationName}
          onChangeText={(value) => updateDraft('locationName', value)}
        />
      </View>
      <TextInput
        placeholder="Address"
        placeholderTextColor={colors.muted}
        style={[styles.input, styles.addressInput]}
        value={draft.address}
        onChangeText={(value) => updateDraft('address', value)}
      />
    </Card>
  );
}

function eventToDraft(event: CommunityEvent): EventDraft {
  return {
    title: event.title || '',
    contactName: event.contactName || '',
    date: event.date || '',
    time: event.time || '',
    address: event.address || '',
    locationName: event.locationName || '',
    audience: eventTypeToAudience(event.type),
    isAnjumanSchedule: event.isAnjumanSchedule ? 'yes' : 'no',
    isPublished: event.isPublished ? 'yes' : 'no',
    waitingApproval: event.waitingApproval ? 'yes' : 'no',
    isPlaceholder: event.isPlaceholder ? 'yes' : 'no',
  };
}

function ensureOption(options: SelectOption[], value: string, fallbackLabel = value) {
  if (!value || options.some((option) => option.value === value)) return options;
  return [{ label: `${fallbackLabel} / current`, value }, ...options];
}

function payloadText(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === 'string' ? value : '';
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: typography.title,
    fontWeight: '900',
  },
  sectionMeta: {
    color: colors.muted,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  loginButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  loginButtonText: {
    color: colors.night,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  signedInRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  signedInCopy: {
    flex: 1,
    minWidth: 220,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  logoutButtonText: {
    color: colors.ink,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sectionTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionTab: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  activeSectionTab: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  sectionText: {
    color: colors.ink,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  activeSectionText: {
    color: colors.night,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  panelCopy: {
    flex: 1,
    minWidth: 260,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  name: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  meta: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  address: {
    color: colors.blue,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  message: {
    color: colors.ink,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  submissionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  submissionCopy: {
    flex: 1,
    minWidth: 220,
  },
  anjumamBadge: {
    backgroundColor: colors.committedBg,
    borderColor: colors.committedBorder,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  communityBadge: {
    backgroundColor: colors.communityBg,
    borderColor: colors.communityBorder,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    color: colors.ink,
    fontSize: typography.label,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  button: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  activeButton: {
    backgroundColor: colors.red,
    borderColor: colors.red,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  ghostButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    color: colors.ink,
    fontWeight: '800',
  },
  activeButtonText: {
    color: '#fff',
    fontWeight: '900',
  },
  ghostButtonText: {
    color: colors.muted,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  notice: {
    color: colors.gold,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  reviewedStack: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  reviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  editorHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  editorCopy: {
    flex: 1,
    minWidth: 260,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  saveButtonText: {
    color: colors.night,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  editorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.ink,
    flexBasis: 220,
    flexGrow: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addressInput: {
    flexBasis: 'auto',
    marginTop: spacing.sm,
    width: '100%',
  },
  stage: {
    color: colors.goldDark,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  yearRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  yearButton: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  activeYearButton: {
    backgroundColor: colors.red,
    borderColor: colors.red,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  yearText: {
    color: colors.ink,
    fontWeight: '900',
  },
  activeYearText: {
    color: '#fff',
    fontWeight: '900',
  },
  monthStack: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  monthRow: {
    alignItems: 'center',
    borderColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  monthNameBlock: {
    flex: 1,
    minWidth: 160,
  },
  monthName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  monthMeta: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  lengthButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  lengthButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    width: 52,
  },
  activeLengthButton: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    width: 52,
  },
  lengthText: {
    color: colors.ink,
    fontWeight: '900',
  },
  activeLengthText: {
    color: colors.night,
    fontWeight: '900',
  },
  calendarNotice: {
    color: colors.gold,
    fontWeight: '800',
    marginTop: spacing.md,
  },
});
