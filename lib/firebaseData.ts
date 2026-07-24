import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import {
  Announcement,
  CommunityEvent,
  events as fallbackEvents,
  islamicTodayLabel,
  MajlisStatus,
  prayerTimes as fallbackPrayerTimes,
  PrayerTime,
  specialEvent as fallbackSpecialEvent,
  SpecialEvent,
  statusItems as fallbackStatusItems,
  StatusItem,
  todayLabel,
} from '@/data/mock';
import type { DocumentData } from 'firebase/firestore';
import type { HomePayload } from '@/lib/api';
import { getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';

const HOUSTON_TIME_ZONE = 'America/Chicago';
const MAX_EVENT_READS = 250;

export function isFirebaseBackendEnabled() {
  return process.env.EXPO_PUBLIC_DATA_BACKEND === 'firebase' && isFirebaseConfigured();
}

export async function fetchEventsFromFirebase(filter = 'all'): Promise<CommunityEvent[]> {
  if (!isFirebaseBackendEnabled()) return fallbackEvents;

  try {
    const db = getFirebaseDb();
    const snapshot = await getDocs(query(collection(db, 'events'), orderBy('date'), limit(MAX_EVENT_READS)));
    const events = snapshot.docs
      .map((eventDoc) => normalizeEvent(eventDoc.id, eventDoc.data()))
      .filter(isPublicEvent)
      .filter((event) => matchesFilter(event, filter));

    return events;
  } catch (error) {
    console.warn('Falling back to mock events after Firestore read failed.', error);
    return fallbackEvents;
  }
}

export async function fetchHomeFromFirebase(): Promise<HomePayload & { specialEvent: SpecialEvent }> {
  if (!isFirebaseBackendEnabled()) {
    return fallbackHome();
  }

  try {
    const db = getFirebaseDb();
    const today = getHoustonDate();
    const [homeDoc, bannerSnapshot, events] = await Promise.all([
      getDoc(doc(db, 'settings', 'home')),
      getDocs(query(collection(db, 'banners'), limit(20))),
      fetchEventsFromFirebase('anjuman'),
    ]);

    const home = homeDoc.exists() ? homeDoc.data() : {};
    const activeBanner = bannerSnapshot.docs
      .map((bannerDoc) => normalizeBanner(bannerDoc.id, bannerDoc.data(), today))
      .find((banner) => banner.isActive);
    const islamicDate = normalizeIslamicDate(home.islamicDate);
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

function fallbackHome(): HomePayload & { specialEvent: SpecialEvent } {
  return {
    date: '',
    label: todayLabel,
    timezone: HOUSTON_TIME_ZONE,
    islamicDate: { day: 13, month: 1, monthName: 'Muharram', year: 1448, label: islamicTodayLabel },
    islamicEvents: [],
    announcements: [],
    featuredAnnouncement: null,
    sayings: [],
    prayerTimes: fallbackPrayerTimes,
    upcomingEvents: fallbackEvents,
    specialEvent: fallbackSpecialEvent,
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

function normalizeIslamicDate(value: unknown): HomePayload['islamicDate'] {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  return {
    day: Number(data.day || 0),
    month: Number(data.month || 0),
    monthName: String(data.monthName || ''),
    year: Number(data.year || 0),
    label: String(data.label || ''),
  };
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
