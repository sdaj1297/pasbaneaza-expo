import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
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
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';
import type {
  AdminEventReviewInput,
  AdminEventSubmission,
  AdminSubmissionStatus,
  PublicSubmissionInput,
  PublicSubmissionResult,
} from '@/lib/api';
import { audienceToEventType } from '@/lib/eventFormOptions';
import {
  invalidateCached,
  invalidateCachedPrefix,
  loadCached,
  peekCached,
  setCached,
} from '@/lib/dataCache';

const HOUSTON_TIME_ZONE = 'America/Chicago';
const MAX_EVENT_READS = 250;
const EVENT_CACHE_KEY = 'firebase:events';
const CALENDAR_YEARS_CACHE_KEY = 'firebase:islamic-calendar';
const ISLAMIC_EVENTS_CACHE_KEY = 'firebase:islamic-events';
const HOME_CACHE_KEY = 'firebase:home';
const PRAYER_CACHE_KEY = 'firebase:prayer-times';
const EVENT_TTL_MS = 60_000;
const CONTENT_TTL_MS = 5 * 60_000;
const STATUS_TTL_MS = 15_000;
const EMPTY_SPECIAL_EVENT: SpecialEvent = {
  id: 'none',
  eyebrow: '',
  title: '',
  dateLabel: '',
  description: '',
  isActive: false,
};

export function isFirebaseBackendEnabled() {
  return process.env.EXPO_PUBLIC_DATA_BACKEND === 'firebase' && isFirebaseConfigured();
}

export async function fetchEventsFromFirebase(
  filter = 'all',
  options: { from?: string; to?: string; approvedOnly?: boolean } = {},
): Promise<CommunityEvent[]> {
  if (!isFirebaseBackendEnabled()) return fallbackEvents;

  try {
    const events = await fetchAllEventsFromFirebase();
    return filterEvents(events, filter, options);
  } catch (error) {
    console.warn('Unable to load events from Firestore.', error);
    return [];
  }
}

async function fetchAllEventsFromFirebase(): Promise<CommunityEvent[]> {
  return loadCached(EVENT_CACHE_KEY, async () => {
    const db = getFirebaseDb();
    const [snapshot, calendarYears] = await Promise.all([
      getDocs(query(collection(db, 'events'), orderBy('date'), limit(MAX_EVENT_READS))),
      fetchIslamicCalendarYearsFromFirebase(),
    ]);
    return snapshot.docs
      .map((eventDoc) => normalizeEvent(eventDoc.id, eventDoc.data()))
      .map((event) => withCalculatedIslamicDate(event, calendarYears));
  }, EVENT_TTL_MS);
}

function filterEvents(
  events: CommunityEvent[],
  filter: string,
  options: { from?: string; to?: string; approvedOnly?: boolean } = {},
) {
  const from = options.from || getHoustonDate();
  return events
      .filter((event) => isPublicEvent(event, Boolean(options.approvedOnly)))
      .filter((event) => event.date >= from)
      .filter((event) => !options.to || event.date <= options.to)
      .filter((event) => matchesFilter(event, filter));
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

  const cacheKey = `firebase:calendar:${date.slice(0, 7)}:${filter}`;
  return loadCached(cacheKey, async () => {
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
  }, EVENT_TTL_MS);
}

export async function fetchHomeFromFirebase(): Promise<HomePayload & { specialEvent: SpecialEvent }> {
  if (!isFirebaseBackendEnabled()) {
    return fallbackHome();
  }

  try {
    return await loadCached(HOME_CACHE_KEY, async () => {
    const db = getFirebaseDb();
    const today = getHoustonDate();
    const [homeDoc, bannerSnapshot, events, calendarYears] = await Promise.all([
      getDoc(doc(db, 'settings', 'home')),
      getDocs(query(collection(db, 'banners'), limit(20))),
      fetchEventsFromFirebase('anjuman', { approvedOnly: true }),
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
      specialEvent: activeBanner || EMPTY_SPECIAL_EVENT,
    };
    }, EVENT_TTL_MS);
  } catch (error) {
    console.warn('Unable to load home data from Firestore.', error);
    return emptyHome();
  }
}

export async function fetchTodayMajlisFromFirebase(): Promise<StatusItem[]> {
  if (!isFirebaseBackendEnabled()) return fallbackStatusItems;

  try {
    const today = getHoustonDate();
    return await loadCached(`firebase:status:${today}`, async () => {
    const db = getFirebaseDb();
    const [eventSnapshot, statusSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'eventDays', today, 'items'), orderBy('sortTime'), limit(MAX_EVENT_READS))),
      getDocs(collection(db, 'majlisStatus', today, 'events')),
    ]);

    const statusByEventId = new Map(statusSnapshot.docs.map((statusDoc) => [statusDoc.id, statusDoc.data()]));
    let events = eventSnapshot.docs
      .map((eventDoc) => normalizeEvent(eventDoc.id, eventDoc.data()))
      .filter((event) => isPublicEvent(event, true))
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
        updatedAt: normalizeTimestamp(statusData.updatedAt) || undefined,
      };
    });

    return statusItems;
    }, STATUS_TTL_MS);
  } catch (error) {
    console.warn('Unable to load majlis status from Firestore.', error);
    return [];
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

  invalidateCached(`firebase:status:${eventDate}`);
  return fetchTodayMajlisFromFirebase();
}

export function subscribeTodayMajlisFromFirebase(
  onItems: (items: StatusItem[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!isFirebaseBackendEnabled()) {
    onItems(fallbackStatusItems);
    return () => undefined;
  }

  const db = getFirebaseDb();
  const today = getHoustonDate();
  const cacheKey = `firebase:status:${today}`;
  let eventItems: CommunityEvent[] = [];
  let statusByEventId = new Map<string, DocumentData>();
  let eventsReady = false;
  let statusesReady = false;
  let disposed = false;

  const publish = async () => {
    if (!eventsReady || !statusesReady || disposed) return;
    let events = eventItems;
    if (!events.length) {
      events = (await fetchEventsFromFirebase('anjuman')).filter((event) => event.date === today);
    }
    if (disposed) return;

    const items = mergeMajlisStatuses(events, statusByEventId);
    setCached(cacheKey, items);
    onItems(items);
  };

  const handleError = (error: Error) => {
    onError?.(error);
    const cached = peekCached<StatusItem[]>(cacheKey);
    onItems(cached ?? []);
  };

  const unsubscribeEvents = onSnapshot(
    query(collection(db, 'eventDays', today, 'items'), orderBy('sortTime'), limit(MAX_EVENT_READS)),
    (snapshot) => {
      eventItems = snapshot.docs
        .map((eventDoc) => normalizeEvent(eventDoc.id, eventDoc.data()))
        .filter((event) => isPublicEvent(event, true))
        .filter((event) => event.isAnjumanSchedule);
      eventsReady = true;
      void publish();
    },
    handleError,
  );
  const unsubscribeStatuses = onSnapshot(
    collection(db, 'majlisStatus', today, 'events'),
    (snapshot) => {
      statusByEventId = new Map(snapshot.docs.map((statusDoc) => [statusDoc.id, statusDoc.data()]));
      statusesReady = true;
      void publish();
    },
    handleError,
  );

  return () => {
    disposed = true;
    unsubscribeEvents();
    unsubscribeStatuses();
  };
}

export async function fetchIslamicCalendarYearsFromFirebase(): Promise<IslamicCalendarYear[]> {
  if (!isFirebaseBackendEnabled()) return fallbackIslamicCalendarYears;

  try {
    return await loadCached(CALENDAR_YEARS_CACHE_KEY, async () => {
    const db = getFirebaseDb();
    const snapshot = await getDocs(query(collection(db, 'islamicCalendar'), orderBy('year'), limit(80)));
    const years = snapshot.docs
      .map((yearDoc) => normalizeIslamicCalendarYear(yearDoc.id, yearDoc.data()))
      .filter((year) => year.months.length === 12 && Boolean(year.firstDate));

    return years.length ? years : fallbackIslamicCalendarYears;
    }, CONTENT_TTL_MS);
  } catch (error) {
    console.warn('Unable to load Islamic calendar from Firestore.', error);
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
  const mirrorSnapshot = await getDoc(doc(db, 'prodMirrorIslamicCalendar', String(year)));
  await setDoc(
    doc(db, 'betaIslamicCalendarOverrides', String(year)),
    {
      kind: 'update',
      baseHash: mirrorSnapshot.exists() ? String(mirrorSnapshot.data().sourceHash || '') : '',
      year: nextYear,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await setDoc(
    doc(db, 'islamicCalendar', String(year)),
    {
      ...nextYear,
      source: 'community',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  invalidateCached(CALENDAR_YEARS_CACHE_KEY, HOME_CACHE_KEY);
  invalidateCachedPrefix('firebase:calendar:');
  return nextYear;
}

export async function fetchPrayerTimesFromFirebase(): Promise<PrayerTime[]> {
  if (!isFirebaseBackendEnabled()) return fallbackPrayerTimes;

  try {
    return await loadCached(PRAYER_CACHE_KEY, async () => {
    const db = getFirebaseDb();
    const snapshot = await getDoc(doc(db, 'settings', 'prayerTimes'));
    const data = snapshot.exists() ? snapshot.data() : {};
    return normalizePrayerTimes(data.times);
    }, CONTENT_TTL_MS);
  } catch (error) {
    console.warn('Unable to load prayer times from Firestore.', error);
    return [];
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
    const [mirrorSnapshot, effectiveSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'prodMirrorEvents'), orderBy('date'), limit(MAX_EVENT_READS))),
      getDocs(query(collection(db, 'events'), orderBy('date'), limit(MAX_EVENT_READS))),
    ]);
    const today = getHoustonDate();
    const effectiveById = new Map(effectiveSnapshot.docs.map((eventDoc) => [
      eventDoc.id,
      normalizeEvent(eventDoc.id, eventDoc.data()),
    ]));
    const mirrorEvents = mirrorSnapshot.docs.map((eventDoc) => (
      effectiveById.get(eventDoc.id) || normalizeEvent(eventDoc.id, eventDoc.data())
    ));
    const mirrorIds = new Set(mirrorSnapshot.docs.map((eventDoc) => eventDoc.id));
    const betaEvents = effectiveSnapshot.docs
      .filter((eventDoc) => !mirrorIds.has(eventDoc.id))
      .map((eventDoc) => normalizeEvent(eventDoc.id, eventDoc.data()));

    return [...mirrorEvents, ...betaEvents]
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
    const db = getFirebaseDb();
    const [effectiveSnapshot, mirrorSnapshot] = await Promise.all([
      getDoc(doc(db, 'events', eventId)),
      getDoc(doc(db, 'prodMirrorEvents', eventId)),
    ]);
    const snapshot = effectiveSnapshot.exists() ? effectiveSnapshot : mirrorSnapshot;
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

export async function deleteAdminEventInFirebase(eventId: string, eventDate: string): Promise<void> {
  if (!isFirebaseBackendEnabled()) return;

  const db = getFirebaseDb();
  const mirrorRef = doc(db, 'prodMirrorEvents', eventId);
  const mirrorSnapshot = await getDoc(mirrorRef);

  if (mirrorSnapshot.exists()) {
    await setDoc(doc(db, 'betaEventOverrides', eventId), {
      kind: 'delete',
      baseHash: String(mirrorSnapshot.data().sourceHash || ''),
      updatedAt: serverTimestamp(),
    });
  } else {
    await deleteDoc(doc(db, 'betaEventOverrides', eventId));
  }

  await deleteDoc(doc(db, 'events', eventId));
  await deleteDoc(doc(db, 'eventDays', eventDate, 'items', eventId));
  invalidateEventCaches();
}

async function writeEvent(event: CommunityEvent, originalDate?: string): Promise<void> {
  const db = getFirebaseDb();
  const eventPayload = serializeEvent(event);
  const mirrorSnapshot = await getDoc(doc(db, 'prodMirrorEvents', event.id));

  await setDoc(doc(db, 'betaEventOverrides', event.id), {
    kind: mirrorSnapshot.exists() ? 'update' : 'created',
    baseHash: mirrorSnapshot.exists() ? String(mirrorSnapshot.data().sourceHash || '') : '',
    event: eventPayload,
    updatedAt: serverTimestamp(),
  }, { merge: true });

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
  invalidateEventCaches();
}

export type ProductionSyncState = {
  status: 'current' | 'error' | 'unknown';
  sourceHash?: string;
  sourceGeneratedAt?: string;
  sourceToday?: string;
  counts?: Record<string, number>;
  writes?: number;
  lastSuccessAt?: string;
  lastCheckedAt?: string;
  lastError?: string;
};

export async function fetchProductionSyncStateFromFirebase(): Promise<ProductionSyncState> {
  if (!isFirebaseBackendEnabled()) return { status: 'unknown' };

  try {
    const snapshot = await getDoc(doc(getFirebaseDb(), 'prodSyncState', 'current'));
    if (!snapshot.exists()) return { status: 'unknown' };
    const data = snapshot.data();
    return {
      status: data.status === 'current' || data.status === 'error' ? data.status : 'unknown',
      sourceHash: stringOrUndefined(data.sourceHash),
      sourceGeneratedAt: stringOrUndefined(data.sourceGeneratedAt),
      sourceToday: stringOrUndefined(data.sourceToday),
      counts: isRecord(data.counts) ? data.counts as Record<string, number> : undefined,
      writes: typeof data.writes === 'number' ? data.writes : undefined,
      lastSuccessAt: normalizeTimestamp(data.lastSuccessAt),
      lastCheckedAt: normalizeTimestamp(data.lastCheckedAt),
      lastError: stringOrUndefined(data.lastError),
    };
  } catch (error) {
    console.warn('Unable to load production synchronization state.', error);
    return { status: 'unknown' };
  }
}

export async function triggerProductionSyncFromFirebase(): Promise<ProductionSyncState> {
  if (!isFirebaseBackendEnabled()) return { status: 'unknown' };

  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Admin login required.');
  const token = await user.getIdToken();
  const response = await fetch('/.netlify/functions/prod-sync-admin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Sync request failed with HTTP ${response.status}.`);
  return fetchProductionSyncStateFromFirebase();
}

async function fetchIslamicEventsFromFirebase(): Promise<IslamicCalendarEvent[]> {
  if (!isFirebaseBackendEnabled()) return fallbackIslamicEvents;

  try {
    return await loadCached(ISLAMIC_EVENTS_CACHE_KEY, async () => {
    const db = getFirebaseDb();
    const snapshot = await getDocs(query(collection(db, 'islamicEvents'), limit(120)));
    const events = snapshot.docs.map((eventDoc) => normalizeIslamicCalendarEvent(eventDoc.id, eventDoc.data()));
    return events.length ? events : fallbackIslamicEvents;
    }, CONTENT_TTL_MS);
  } catch (error) {
    console.warn('Unable to load Islamic events from Firestore.', error);
    return fallbackIslamicEvents;
  }
}

export function peekEventsFromFirebase(
  filter = 'all',
  options: { from?: string; to?: string; approvedOnly?: boolean } = {},
): CommunityEvent[] | undefined {
  const events = peekCached<CommunityEvent[]>(EVENT_CACHE_KEY);
  return events ? filterEvents(events, filter, options) : undefined;
}

export function peekHomeFromFirebase(): (HomePayload & { specialEvent: SpecialEvent }) | undefined {
  return peekCached(HOME_CACHE_KEY);
}

export function peekCalendarMonthFromFirebase(
  date: string,
  filter: CalendarFilter,
): CalendarMonthPayload | undefined {
  return peekCached(`firebase:calendar:${date.slice(0, 7)}:${filter}`);
}

export function peekTodayMajlisFromFirebase(): StatusItem[] | undefined {
  return peekCached(`firebase:status:${getHoustonDate()}`);
}

export function peekPrayerTimesFromFirebase(): PrayerTime[] | undefined {
  return peekCached(PRAYER_CACHE_KEY);
}

export async function preloadPrimaryFirebaseData(): Promise<void> {
  if (!isFirebaseBackendEnabled()) return;
  const today = getHoustonDate();
  await Promise.allSettled([
    fetchEventsFromFirebase('all'),
    fetchIslamicCalendarYearsFromFirebase(),
    fetchPrayerTimesFromFirebase(),
  ]);

  await Promise.allSettled(
    (['all', 'anjuman', 'brothers', 'sisters', 'family'] as CalendarFilter[]).map((filter) =>
      fetchCalendarMonthFromFirebase(today, filter),
    ),
  );
}

function mergeMajlisStatuses(
  events: CommunityEvent[],
  statusByEventId: Map<string, DocumentData>,
): StatusItem[] {
  return events.map((event) => {
    const statusData = statusByEventId.get(event.id) || {};
    const status = normalizeStatus(statusData.status);
    return {
      ...event,
      status,
      stage: typeof statusData.stage === 'string' && statusData.stage.trim() ? statusData.stage : undefined,
      updatedAt: normalizeTimestamp(statusData.updatedAt) || undefined,
    };
  });
}

function invalidateEventCaches() {
  invalidateCached(EVENT_CACHE_KEY, HOME_CACHE_KEY);
  invalidateCachedPrefix('firebase:calendar:');
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

function emptyHome(): HomePayload & { specialEvent: SpecialEvent } {
  const today = getHoustonDate();
  return {
    date: today,
    label: getDisplayDate(today),
    timezone: HOUSTON_TIME_ZONE,
    islamicDate: null,
    islamicEvents: [],
    announcements: [],
    featuredAnnouncement: null,
    sayings: [],
    prayerTimes: [],
    upcomingEvents: [],
    specialEvent: EMPTY_SPECIAL_EVENT,
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
    source: 'beta',
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
  if (!Array.isArray(value)) return [];
  const times = value
    .map((item) => ({
      label: String(item?.label || ''),
      time: String(item?.time || ''),
    }))
    .filter((item) => item.label && item.time);

  return times;
}

function isPublicEvent(event: CommunityEvent, approvedOnly = false) {
  if (!event.isPublished || !event.date) return false;
  return approvedOnly ? !event.waitingApproval && !event.isPlaceholder : true;
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
