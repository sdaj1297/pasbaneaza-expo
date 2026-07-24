import {
  Announcement,
  CommunityEvent,
  events,
  islamicTodayLabel,
  prayerTimes,
  PrayerTime,
  specialEvent,
  SpecialEvent,
  statusItems,
  StatusItem,
  todayLabel,
} from '@/data/mock';
import {
  fetchEventsFromFirebase,
  fetchHomeFromFirebase,
  fetchPrayerTimesFromFirebase,
  fetchTodayMajlisFromFirebase,
  isFirebaseBackendEnabled,
  updateMajlisStatusInFirebase,
} from '@/lib/firebaseData';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

async function request<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) throw new Error(`API ${response.status}`);
    return await response.json();
  } catch {
    return fallback;
  }
}

async function sendJson<T>(path: string, body: unknown, fallback: T, method = 'POST'): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return await response.json();
  } catch {
    return fallback;
  }
}

export type IslamicDate = {
  day: number;
  month: number;
  monthName: string;
  year: number;
  label: string;
};

export type HomePayload = {
  date: string;
  label: string;
  timezone: string;
  islamicDate: IslamicDate | null;
  islamicEvents: { id: string; title: string; description: string; color: string }[];
  announcements: Announcement[];
  featuredAnnouncement: Announcement | null;
  sayings: { id: string; who: string; saying: string }[];
  prayerTimes: PrayerTime[];
  upcomingEvents: CommunityEvent[];
};

const fallbackHome: HomePayload = {
  date: '',
  label: todayLabel,
  timezone: 'America/Chicago',
  islamicDate: { day: 13, month: 1, monthName: 'Muharram', year: 1448, label: islamicTodayLabel },
  islamicEvents: [],
  announcements: [],
  featuredAnnouncement: null,
  sayings: [],
  prayerTimes,
  upcomingEvents: events,
};

export async function fetchEvents(filter = 'all'): Promise<CommunityEvent[]> {
  if (isFirebaseBackendEnabled()) return fetchEventsFromFirebase(filter);

  const result = await request<{ events: CommunityEvent[] }>(`/events?filter=${filter}`, { events });
  return result.events;
}

export async function fetchHome(): Promise<HomePayload & { specialEvent: SpecialEvent }> {
  if (isFirebaseBackendEnabled()) return fetchHomeFromFirebase();

  const home = await request<HomePayload>('/home', fallbackHome);
  return {
    ...home,
    specialEvent: home.featuredAnnouncement
      ? {
          id: home.featuredAnnouncement.id,
          eyebrow: 'Featured Event',
          title: home.featuredAnnouncement.title,
          dateLabel: home.islamicDate?.label || home.label,
          description: home.featuredAnnouncement.body,
          flyerUrl: home.featuredAnnouncement.imageUrl,
          isActive: true,
        }
      : specialEvent,
  };
}

export async function fetchTodayMajlis(): Promise<StatusItem[]> {
  if (isFirebaseBackendEnabled()) return fetchTodayMajlisFromFirebase();

  const result = await request<{ events: StatusItem[] }>('/majlis-status/today', { events: statusItems });
  return result.events.map((event, index) => ({
    ...event,
    status: event.status || (index === 0 ? 'Started' : 'Pending'),
    stage: event.stage || (event.status === 'Started' ? 'Hadis e Kisa' : undefined),
  }));
}

export async function updateMajlisStatus(eventId: string, eventDate: string, status: StatusItem['status'], stage?: string): Promise<StatusItem[]> {
  if (isFirebaseBackendEnabled()) {
    return updateMajlisStatusInFirebase(eventId, eventDate, status, stage);
  }

  const result = await sendJson<{ board: { events: StatusItem[] } }>(
    `/majlis-status/${eventId}`,
    {
      eventDate,
      status,
      stage,
      source: 'community',
    },
    { board: { events: statusItems } },
    'PATCH',
  );
  return result.board.events;
}

export async function fetchPrayerTimes(): Promise<PrayerTime[]> {
  if (isFirebaseBackendEnabled()) return fetchPrayerTimesFromFirebase();

  const result = await request<{ times: PrayerTime[] }>('/prayer-times/today', { times: prayerTimes });
  return result.times;
}
