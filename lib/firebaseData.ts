import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import {
  Announcement,
  CommunityEvent,
  events as fallbackEvents,
  islamicCalendarYears as fallbackIslamicCalendarYears,
  islamicEvents as fallbackIslamicEvents,
  MajlisStatus,
  prayerTimes as fallbackPrayerTimes,
  PrayerTime,
  specialEvent as fallbackSpecialEvent,
  SpecialEvent,
  statusItems as fallbackStatusItems,
  StatusItem,
} from '@/data/mock';
import {
  buildCalendarMonth,
  calculateIslamicDate,
  CalendarFilter,
  CalendarMonthPayload,
  getMonthRange,
  IslamicCalendarEvent,
  IslamicCalendarYear,
  islamicMonthDefinitions,
} from '@/lib/calendarUtils';
import type { DocumentData } from 'firebase/firestore';
import type { HomePayload } from '@/lib/api';
import { getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';
import type {
  AdminEventReviewInput,
  AdminEventSubmission,
  AdminSubmissionStatus,
  PublicSubmissionInput,
  PublicSubmissionResult,
} from '@/lib/api';
import { audienceToEventType } from '@/lib/eventFormOptions';

const HOUSTON_TIME_ZONE = 'America/Chicago';
const MAX_EVENT_READS = 250;

export function isFirebaseBackendEnabled() {
  return process.env.EXPO_PUBLIC_DATA_BACKEND === 'firebase' && isFirebaseConfigured();
}

export async function fetchEventsFromFirebase(
  filter = 'all',
  options: { from?: string; to?: string } = {},
): Promise<CommunityEvent[]> {
  if (!isFirebaseBackendEnabled()) return fallbackEvents;

  try {
    const db = getFirebaseDb();
    const [snapshot, calendarYears] = await Promise.all([
      getDocs(query(collection(db, 'events'), orderBy('date'), limit(MAX_EVENT_READS))),
      fetchIslamicCalendarYearsFromFirebase(),
    ]);
    const from = options.from || getHoustonDate();
    const events = snapshot.docs
      .map((eventDoc) => normalizeEvent(eventDoc.id, eventDoc.data()))
      .map((event) => withCalculatedIslamicDate(event, calendarYears))
      .filter(isPublicEvent)
      .filter((event) => event.date >= from)
      .filter((event) => !options.to || event.date <= options.to)
      .filter((event) => matchesFilter(event, filter));

    return events;
  } catch (error) {
    console.warn('Falling back to mock events after Firestore read failed.', error);
    return fallbackEvents;
  }
}

export async function fetchCalendarMonthFromFirebase(
  date: string,
  filter: CalendarFilter,
): Promise<CalendarMonthPayload> {
  if (!isFirebaseBackendEnabled()) {
    return buildCalendarMonth({
      date,
      filter,
      events: fallbackEvents.filter((event) => matchesFilter(event, filter)),
      calendarYears: fallbackIslamicCalendarYears,
      islamicEvents: fallbackIslamicEvents,
    });
  }

  const range = getMonthRange(date);
  const [events, calendarYears, islamicEvents] = await Promise.all([
    fetchEventsFromFirebase(filter, { from: range.gridStart, to: range.gridEnd }),
    fetchIslamicCalendarYearsFromFirebase(),
    fetchIslamicEventsFromFirebase(),
  ]);

  return buildCalendarMonth({
    date,
    filter,
    events,
    calendarYears,
    islamicEvents,
  });
}

export async function fetchHomeFromFirebase(): Promise<HomePayload & { specialEvent: SpecialEvent }> {
  if (!isFirebaseBackendEnabled()) {
    return fallbackHome();
  }

  try {
    const db = getFirebaseDb();
    const today = getHoustonDate();
    const [homeDoc, bannerSnapshot, events, calendarYears] = await Promise.all([
      getDoc(doc(db, 'settings', 'home')),
      getDocs(query(collection(db, 'banners'), limit(20))),
      fetchEventsFromFirebase('anjuman'),
      fetchIslamicCalendarYearsFromFirebase(),
    ]);

    const home = homeDoc.exists() ? homeDoc.data() : {};
    const activeBanner = bannerSnapshot.docs
      .map((bannerDoc) => normalizeBanner(bannerDoc.id, bannerDoc.data(), today))
      .find((banner) => banner.isActive);
    const islamicDate = calculateIslamicDate(today, calendarYears);
    const upcomingEvents = events.slice(0, 6);

    return {
      date: today,
      label: getDisplayDate(today),
      timezone: HOUSTON_TIME_ZONE,
      islamicDate,
      islamicEvents: Array.isArray(home.islamicEvents) ? home.islamicEvents : [],
      announcements: Array.isArray(home.announcements) ? home.announcements : [],
      featuredAnnouncement: null,
      sayings: Array.isArray(home.sayings) ? home.sayings : [],
      prayerTimes: normalizePrayerTimes(home.prayerTimes),
      upcomingEvents,
      specialEvent: activeBanner || fallbackSpecialEvent,
    };
  } catch (error) {
    console.warn('Falling back to mock home data after Firestore read failed.', error);
    return fallbackHome();
  }
}

export async function fetchTodayMajlisFromFirebase(): Promise<StatusItem[]> {
  if (!isFirebaseBackendEnabled()) return fallbackStatusItems;

  try {
    const db = getFirebaseDb();
    const today = getHoustonDate();
    const [eventSnapshot, statusSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'eventDays', today, 'items'), orderBy('sortTime'), limit(MAX_EVENT_READS))),
      getDocs(collection(db, 'majlisStatus', today, 'events')),
    ]);

    const statusByEventId = new Map(statusSnapshot.docs.map((statusDoc) => [statusDoc.id, statusDoc.data()]));
    let events = eventSnapshot.docs
      .map((eventDoc) => normalizeEvent(eventDoc.id, eventDoc.data()))
      .filter(isPublicEvent)
      .filter((event) => event.isAnjumanSchedule);

    if (!events.length) {
      events = (await fetchEventsFromFirebase('anjuman')).filter((event) => event.date === today);
    }

    const statusItems = events.map((event) => {
      const statusData = statusByEventId.get(event.id) || {};
      const status = normalizeStatus(statusData.status);
      return {
        ...event,
        status,
        stage: typeof statusData.stage === 'string' && statusData.stage.trim() ? statusData.stage : undefined,
      };
    });

    return statusItems;
  } catch (error) {
    console.warn('Falling back to mock majlis status after Firestore read failed.', error);
    return fallbackStatusItems;
  }
}

export async function updateMajlisStatusInFirebase(
  eventId: string,
  eventDate: string,
  status: MajlisStatus,
  stage?: string,
): Promise<StatusItem[]> {
  if (!isFirebaseBackendEnabled()) return fallbackStatusItems;

  const db = getFirebaseDb();
  await setDoc(
    doc(db, 'majlisStatus', eventDate, 'events', eventId),
    {
      eventId,
      eventDate,
      status,
      stage: stage || '',
      source: 'community',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return fetchTodayMajlisFromFirebase();
}

export async function fetchIslamicCalendarYearsFromFirebase(): Promise<IslamicCalendarYear[]> {
  if (!isFirebaseBackendEnabled()) return fallbackIslamicCalendarYears;

  try {
    const db = getFirebaseDb();
    const snapshot = await getDocs(query(collection(db, 'islamicCalendar'), orderBy('year'), limit(80)));
    const years = snapshot.docs
      .map((yearDoc) => normalizeIslamicCalendarYear(yearDoc.id, yearDoc.data()))
      .filter((year) => year.months.length === 12 && Boolean(year.firstDate));

    return years.length ? years : fallbackIslamicCalendarYears;
  } catch (error) {
    console.warn('Falling back to mock Islamic calendar after Firestore read failed.', error);
    return fallbackIslamicCalendarYears;
  }
}

export async function updateIslamicMonthLengthInFirebase(
  year: number,
  month: number,
  length: 29 | 30,
): Promise<IslamicCalendarYear> {
  if (!isFirebaseBackendEnabled()) return fallbackIslamicCalendarYears[0];

  const years = await fetchIslamicCalendarYearsFromFirebase();
  const currentYear = years.find((item) => item.year === year);

  if (!currentYear) {
    throw new Error(`Islamic calendar year ${year} was not found.`);
  }

  const nextYear = {
    ...currentYear,
    months: currentYear.months.map((item) => item.index === month ? { ...item, length } : item),
  };

  const db = getFirebaseDb();
  await setDoc(
    doc(db, 'islamicCalendar', String(year)),
    {
      ...nextYear,
      source: 'community',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return nextYear;
}

export async function fetchPrayerTimesFromFirebase(): Promise<PrayerTime[]> {
  if (!isFirebaseBackendEnabled()) return fallbackPrayerTimes;

  try {
    const db = getFirebaseDb();
    const snapshot = await getDoc(doc(db, 'settings', 'prayerTimes'));
    const data = snapshot.exists() ? snapshot.data() : {};
    return normalizePrayerTimes(data.times);
  } catch (error) {
    console.warn('Falling back to mock prayer times after Firestore read failed.', error);
    return fallbackPrayerTimes;
  }
}

export async function submitPublicFormToFirebase(input: PublicSubmissionInput): Promise<PublicSubmissionResult> {
  if (!isFirebaseBackendEnabled()) {
    return {
      id: `local-${Date.now()}`,
      type: input.type,
      status: input.type === 'event' ? 'pending_review' : 'new',
    };
  }

  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, 'submissions'), {
    type: input.type,
    name: input.name || '',
    email: input.email || '',
    phone: input.phone || '',
    message: input.message || '',
    payload: input.payload || {},
    source: input.source || 'website',
    status: input.type === 'event' ? 'pending_review' : 'new',
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    type: input.type,
    status: input.type === 'event' ? 'pending_review' : 'new',
  };
}

export async function fetchAdminEventSubmissionsFromFirebase(): Promise<AdminEventSubmission[]> {
  if (!isFirebaseBackendEnabled()) return [];

  try {
    const db = getFirebaseDb();
    const snapshot = await getDocs(query(collection(db, 'submissions'), orderBy('createdAt', 'desc'), limit(120)));
    return snapshot.docs
      .map((submissionDoc) => normalizeSubmission(submissionDoc.id, submissionDoc.data()))
      .filter((submission) => submission.type === 'event');
  } catch (error) {
    console.warn('Unable to load admin event submissions from Firestore.', error);
    return [];
  }
}

export async function fetchAdminEventsFromFirebase(): Promise<CommunityEvent[]> {
  if (!isFirebaseBackendEnabled()) return fallbackEvents;

  try {
    const db = getFirebaseDb();
    const snapshot = await getDocs(query(collection(db, 'events'), orderBy('date'), limit(MAX_EVENT_READS)));
    const today = getHoustonDate();
    return snapshot.docs
      .map((eventDoc) => normalizeEvent(eventDoc.id, eventDoc.data()))
      .filter((event) => event.date >= today)
      .sort(compareEvents);
  } catch (error) {
    console.warn('Unable to load admin events from Firestore.', error);
    return fallbackEvents;
  }
}

export async function fetchAdminEventFromFirebase(eventId: string): Promise<CommunityEvent | null> {
  if (!isFirebaseBackendEnabled()) {
    return fallbackEvents.find((event) => event.id === eventId) || null;
  }

  try {
    const snapshot = await getDoc(doc(getFirebaseDb(), 'events', eventId));
    return snapshot.exists() ? normalizeEvent(snapshot.id, snapshot.data()) : null;
  } catch (error) {
    console.warn('Unable to load admin event from Firestore.', error);
    return null;
  }
}

export async function updateEventSubmissionStatusInFirebase(
  submissionId: string,
  status: AdminSubmissionStatus,
): Promise<void> {
  if (!isFirebaseBackendEnabled()) return;

  const db = getFirebaseDb();
  await updateDoc(doc(db, 'submissions', submissionId), {
    status,
    reviewedAt: serverTimestamp(),
  });
}

export async function createEventFromSubmissionInFirebase(
  submission: AdminEventSubmission,
  review: AdminEventReviewInput,
): Promise<CommunityEvent> {
  if (!isFirebaseBackendEnabled()) {
    return fallbackEvents[0];
  }

  const payload = submission.payload || {};
  const eventId = `review-${submission.id}`;
  const event: CommunityEvent = {
    id: eventId,
    title: stringOrUndefined(payload.eventTitle) || 'Majlis',
    contactName: submission.name || stringOrUndefined(payload.contactName) || 'Contact pending',
    date: normalizeDate(payload.eventDate),
    time: String(payload.eventTime || ''),
    islamicDate: '',
    type: audienceToEventType(String(payload.eventAudience || 'Family')),
    locationName: 'Residence',
    address: String(payload.eventAddress || ''),
    flyer: stringOrUndefined(payload.flyerUrl),
    socialUrl: stringOrUndefined(payload.socialUrl),
    isAnjumanSchedule: review.isAnjumanSchedule,
    isPublished: review.isPublished,
    waitingApproval: review.waitingApproval,
    isPlaceholder: review.isPlaceholder,
  };

  await writeEvent(event, submission.payload?.eventDate ? String(submission.payload.eventDate) : undefined);
  await updateEventSubmissionStatusInFirebase(
    submission.id,
    review.waitingApproval || review.isPlaceholder ? 'placeholder_created' : 'approved',
  );

  return event;
}

export async function updateAdminEventInFirebase(
  eventId: string,
  originalDate: string,
  patch: Partial<CommunityEvent>,
): Promise<CommunityEvent> {
  if (!isFirebaseBackendEnabled()) {
    const fallback = fallbackEvents.find((event) => event.id === eventId) || fallbackEvents[0];
    return { ...fallback, ...patch };
  }

  const db = getFirebaseDb();
  const currentSnapshot = await getDoc(doc(db, 'events', eventId));
  const currentEvent = currentSnapshot.exists()
    ? normalizeEvent(eventId, currentSnapshot.data())
    : ({ id: eventId, ...patch } as CommunityEvent);
  const nextEvent: CommunityEvent = {
    ...currentEvent,
    ...patch,
    id: eventId,
    date: normalizeDate(patch.date || currentEvent.date),
    time: String(patch.time ?? currentEvent.time ?? ''),
  };

  await writeEvent(nextEvent, originalDate);
  return nextEvent;
}

async function writeEvent(event: CommunityEvent, originalDate?: string): Promise<void> {
  const db = getFirebaseDb();
  const eventPayload = serializeEvent(event);

  await setDoc(doc(db, 'events', event.id), eventPayload, { merge: true });
  await setDoc(doc(db, 'eventDays', event.date), {
    date: event.date,
    source: 'admin',
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await setDoc(doc(db, 'eventDays', event.date, 'items', event.id), eventPayload, { merge: true });

  if (originalDate && originalDate !== event.date) {
    await deleteDoc(doc(db, 'eventDays', originalDate, 'items', event.id));
  }
}

async function fetchIslamicEventsFromFirebase(): Promise<IslamicCalendarEvent[]> {
  if (!isFirebaseBackendEnabled()) return fallbackIslamicEvents;

  try {
    const db = getFirebaseDb();
    const snapshot = await getDocs(query(collection(db, 'islamicEvents'), limit(120)));
    const events = snapshot.docs.map((eventDoc) => normalizeIslamicCalendarEvent(eventDoc.id, eventDoc.data()));
    return events.length ? events : fallbackIslamicEvents;
  } catch (error) {
    console.warn('Falling back to mock Islamic events after Firestore read failed.', error);
    return fallbackIslamicEvents;
  }
}

function fallbackHome(): HomePayload & { specialEvent: SpecialEvent } {
  const today = getHoustonDate();
  return {
    date: today,
    label: getDisplayDate(today),
    timezone: HOUSTON_TIME_ZONE,
    islamicDate: calculateIslamicDate(today, fallbackIslamicCalendarYears),
    islamicEvents: [],
    announcements: [],
    featuredAnnouncement: null,
    sayings: [],
    prayerTimes: fallbackPrayerTimes,
    upcomingEvents: fallbackEvents,
    specialEvent: fallbackSpecialEvent,
  };
}

function normalizeIslamicCalendarYear(id: string, data: DocumentData): IslamicCalendarYear {
  const monthsValue = data.months;
  const months = islamicMonthDefinitions.map((definition) => {
    const fromArray = Array.isArray(monthsValue)
      ? monthsValue.find((item) => Number(item?.index) === definition.index || item?.key === definition.key)
      : undefined;
    const fromObject = monthsValue && !Array.isArray(monthsValue) && typeof monthsValue === 'object'
      ? monthsValue[definition.key] || monthsValue[String(definition.index)]
      : undefined;

    return {
      ...definition,
      length: Number(fromArray?.length || fromObject?.length || fromObject || data[definition.key] || 0),
    };
  });

  return {
    id,
    year: Number(data.year || data.lunarYear || id),
    firstDate: normalizeDate(data.firstDate || data.FIRST_DATE),
    months,
  };
}

function normalizeIslamicCalendarEvent(id: string, data: DocumentData): IslamicCalendarEvent {
  return {
    id,
    month: Number(data.month || data.IMONTH || 0),
    day: Number(data.day || data.IDAY || 0),
    title: String(data.title || data.IEVENT || ''),
    description: String(data.description || data.EVENT_DESC || ''),
    color: String(data.color || data.ICOLOR || ''),
  };
}

function normalizeEvent(id: string, data: DocumentData): CommunityEvent {
  return {
    id: String(data.id || data.eventId || id),
    title: String(data.title || data.eventTitle || data.EVENT_DESC || 'Majlis'),
    contactName: String(data.contactName || data.contact || data.name || data.title || 'Pasban-e-Aza'),
    date: normalizeDate(data.date || data.eventDate || data.EVENT_DATE),
    time: String(data.time || data.eventTime || ''),
    islamicDate: String(data.islamicDate || data.hijriDate || ''),
    type: String(data.type || data.eventType || 'M'),
    locationName: String(data.locationName || data.location || data.subdivision || ''),
    address: String(data.address || data.fullAddress || ''),
    flyer: stringOrUndefined(data.flyer || data.flyerUrl || data.imageUrl),
    socialUrl: stringOrUndefined(data.socialUrl || data.youtubeUrl || data.instagramUrl),
    isAnjumanSchedule: Boolean(data.isAnjumanSchedule ?? data.addToSchedule ?? data.ADDTOSCHD),
    isPublished: data.isPublished !== false && data.publish !== false && data.PUBLISH !== 0,
    waitingApproval: Boolean(data.waitingApproval || data.WAITING_APPROVAL),
    isPlaceholder: Boolean(data.isPlaceholder || data.placeholder || data.PLACE_HOLDER),
  };
}

function withCalculatedIslamicDate(
  event: CommunityEvent,
  calendarYears: IslamicCalendarYear[],
): CommunityEvent {
  const islamicDate = calculateIslamicDate(event.date, calendarYears);
  return {
    ...event,
    islamicDate: islamicDate?.label || event.islamicDate,
  };
}

function normalizeSubmission(id: string, data: DocumentData): AdminEventSubmission {
  return {
    id,
    type: String(data.type || 'contact') as AdminEventSubmission['type'],
    name: String(data.name || ''),
    email: String(data.email || ''),
    phone: String(data.phone || ''),
    message: String(data.message || ''),
    payload: isRecord(data.payload) ? data.payload : {},
    source: String(data.source || ''),
    status: String(data.status || 'new') as AdminSubmissionStatus,
    createdAt: normalizeTimestamp(data.createdAt),
    reviewedAt: normalizeTimestamp(data.reviewedAt),
  };
}

function serializeEvent(event: CommunityEvent): Record<string, unknown> {
  return {
    id: event.id,
    eventId: event.id,
    title: event.title || 'Majlis',
    contactName: event.contactName || event.title || 'Contact pending',
    date: event.date,
    time: event.time || '',
    sortTime: toSortTime(event.time || ''),
    islamicDate: event.islamicDate || '',
    type: event.type || 'M',
    locationName: event.locationName || '',
    address: event.address || '',
    flyer: event.flyer || '',
    socialUrl: event.socialUrl || '',
    isAnjumanSchedule: Boolean(event.isAnjumanSchedule),
    addToSchedule: Boolean(event.isAnjumanSchedule),
    isPublished: event.isPublished !== false,
    publish: event.isPublished !== false,
    waitingApproval: Boolean(event.waitingApproval),
    isPlaceholder: Boolean(event.isPlaceholder),
    source: 'admin',
    updatedAt: serverTimestamp(),
  };
}

function normalizeBanner(id: string, data: DocumentData, today: string): SpecialEvent {
  const startsAt = normalizeOptionalDate(data.startsAt || data.startDate);
  const endsAt = normalizeOptionalDate(data.endsAt || data.endDate);
  const isWithinWindow = (!startsAt || startsAt <= today) && (!endsAt || endsAt >= today);

  return {
    id,
    eyebrow: String(data.eyebrow || 'Featured Event'),
    title: String(data.title || 'Special Event'),
    dateLabel: String(data.dateLabel || ''),
    description: String(data.description || data.body || ''),
    flyerUrl: stringOrUndefined(data.flyerUrl || data.imageUrl),
    liveStreamUrl: stringOrUndefined(data.liveStreamUrl || data.youtubeEmbedUrl),
    isActive: Boolean(data.isActive ?? data.active) && isWithinWindow,
  };
}

function normalizePrayerTimes(value: unknown): PrayerTime[] {
  if (!Array.isArray(value)) return fallbackPrayerTimes;
  const times = value
    .map((item) => ({
      label: String(item?.label || ''),
      time: String(item?.time || ''),
    }))
    .filter((item) => item.label && item.time);

  return times.length ? times : fallbackPrayerTimes;
}

function isPublicEvent(event: CommunityEvent) {
  return event.isPublished && !event.waitingApproval && Boolean(event.date);
}

function matchesFilter(event: CommunityEvent, filter: string) {
  switch (filter) {
    case 'anjuman':
      return event.isAnjumanSchedule;
    case 'brothers':
      return ['M', 'F', 'A'].includes(event.type);
    case 'sisters':
      return ['W', 'F', 'A'].includes(event.type);
    case 'family':
      return ['F', 'A'].includes(event.type);
    default:
      return true;
  }
}

function normalizeStatus(status: unknown): MajlisStatus {
  const value = String(status || 'Pending') as MajlisStatus;
  return ['Pending', 'En Route', 'Started', 'Completed', 'Delayed', 'Skipped'].includes(value) ? value : 'Pending';
}

function normalizeDate(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function normalizeOptionalDate(value: unknown) {
  const date = normalizeDate(value);
  return date || undefined;
}

function stringOrUndefined(value: unknown) {
  const text = String(value || '').trim();
  return text || undefined;
}

function getHoustonDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HOUSTON_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function getDisplayDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function normalizeTimestamp(value: unknown) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toSortTime(time: string) {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time || '99:99';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const suffix = match[3].toUpperCase();
  const hour24 = suffix === 'PM' && hour !== 12 ? hour + 12 : suffix === 'AM' && hour === 12 ? 0 : hour;
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function compareEvents(left: CommunityEvent, right: CommunityEvent) {
  const leftKey = `${left.date} ${toSortTime(left.time)}`;
  const rightKey = `${right.date} ${toSortTime(right.time)}`;
  return leftKey.localeCompare(rightKey);
}
