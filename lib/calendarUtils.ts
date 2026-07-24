import { Platform } from 'react-native';

import { CommunityEvent } from '@/data/mock';

export const HOUSTON_TIME_ZONE = 'America/Chicago';

export type CalendarFilter = 'all' | 'anjuman' | 'brothers' | 'sisters' | 'family';

export type IslamicDateInfo = {
  day: number;
  month: number;
  monthName: string;
  year: number;
  label: string;
};

export type IslamicMonthLength = {
  index: number;
  key: string;
  name: string;
  length: number;
};

export type IslamicCalendarYear = {
  id: string;
  year: number;
  firstDate: string;
  months: IslamicMonthLength[];
};

export type IslamicCalendarEvent = {
  id: string;
  month: number;
  day: number;
  title: string;
  description: string;
  color: string;
};

export type CalendarEvent = CommunityEvent & {
  calendarPrefix?: string;
};

export type CalendarDay = {
  date: string;
  dayOfMonth: number;
  weekday: string;
  displayDate: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  islamicDate: IslamicDateInfo | null;
  islamicEvents: IslamicCalendarEvent[];
  events: CalendarEvent[];
};

export type CalendarMonthPayload = {
  month: {
    year: number;
    month: number;
    label: string;
    startDate: string;
    endDate: string;
    gridStart: string;
    gridEnd: string;
  };
  filter: CalendarFilter;
  timezone: string;
  today: string;
  days: CalendarDay[];
  events: CalendarEvent[];
};

export const islamicMonthDefinitions: Omit<IslamicMonthLength, 'length'>[] = [
  { index: 1, key: 'MUHARRAM', name: 'Muharram' },
  { index: 2, key: 'SAFAR', name: 'Safar' },
  { index: 3, key: 'RABIA_AWAL', name: 'Rabi al-Awwal' },
  { index: 4, key: 'RABIA_THANI', name: 'Rabi al-Thani' },
  { index: 5, key: 'JAMADIAL_AWAL', name: 'Jumada al-Awwal' },
  { index: 6, key: 'JAMADIAL_THANI', name: 'Jumada al-Thani' },
  { index: 7, key: 'RAJAB', name: 'Rajab' },
  { index: 8, key: 'SHABAN', name: 'Shaban' },
  { index: 9, key: 'RAMAZAN', name: 'Ramadan' },
  { index: 10, key: 'SHAWWAL', name: 'Shawwal' },
  { index: 11, key: 'ZILQADAH', name: 'Dhu al-Qadah' },
  { index: 12, key: 'ZILHAJ', name: 'Dhu al-Hijjah' },
];

const DEFAULT_DURATION_MINUTES = 90;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getHoustonDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HOUSTON_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

export function getMonthRange(dateString = getHoustonDate()) {
  const date = parseDate(dateString);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1, 12));
  const last = new Date(Date.UTC(year, month + 1, 0, 12));
  const startDate = formatDate(first);
  const endDate = formatDate(last);
  const gridStart = addDays(startDate, -first.getUTCDay());
  const gridEnd = addDays(endDate, 6 - last.getUTCDay());

  return {
    year,
    month: month + 1,
    label: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first),
    startDate,
    endDate,
    gridStart,
    gridEnd,
  };
}

export function addMonths(dateString: string, amount: number) {
  const date = parseDate(dateString);
  date.setUTCMonth(date.getUTCMonth() + amount, 1);
  return formatDate(date);
}

export function addDays(dateString: string, amount: number) {
  const date = parseDate(dateString);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDate(date);
}

export function calculateIslamicDate(dateString: string, calendarYears: IslamicCalendarYear[]): IslamicDateInfo | null {
  const calendar = [...calendarYears]
    .filter((year) => year.firstDate <= dateString)
    .sort((a, b) => (a.firstDate < b.firstDate ? 1 : -1))[0];

  if (!calendar) return null;

  let remainingDays = daysBetween(calendar.firstDate, dateString);

  for (const month of calendar.months) {
    if (remainingDays < month.length) {
      const day = remainingDays + 1;
      return {
        day,
        month: month.index,
        monthName: month.name,
        year: calendar.year,
        label: `${day} ${month.name}, ${calendar.year}`,
      };
    }
    remainingDays -= month.length;
  }

  return null;
}

export function buildCalendarMonth(input: {
  date?: string;
  filter?: CalendarFilter;
  events: CommunityEvent[];
  calendarYears?: IslamicCalendarYear[];
  islamicEvents?: IslamicCalendarEvent[];
  today?: string;
}): CalendarMonthPayload {
  const today = input.today || getHoustonDate();
  const range = getMonthRange(input.date || today);
  const eventBuckets = new Map<string, CalendarEvent[]>();
  const calendarYears = input.calendarYears || [];
  const islamicEvents = input.islamicEvents || [];

  for (const event of input.events) {
    const bucket = eventBuckets.get(event.date) || [];
    bucket.push({
      ...event,
      calendarPrefix: eventTypeLabel(event),
    });
    eventBuckets.set(event.date, bucket);
  }

  const days = getDateSpan(range.gridStart, range.gridEnd).map((date) => {
    const parsed = parseDate(date);
    const islamicDate = calculateIslamicDate(date, calendarYears);

    return {
      date,
      dayOfMonth: parsed.getUTCDate(),
      weekday: DAY_NAMES[parsed.getUTCDay()],
      displayDate: getDisplayDate(date),
      isCurrentMonth: date >= range.startDate && date <= range.endDate,
      isToday: date === today,
      islamicDate,
      islamicEvents: islamicDate
        ? islamicEvents.filter((event) => event.month === islamicDate.month && event.day === islamicDate.day)
        : [],
      events: eventBuckets.get(date) || [],
    };
  });

  return {
    month: range,
    filter: input.filter || 'all',
    timezone: HOUSTON_TIME_ZONE,
    today,
    days,
    events: input.events
      .filter((event) => event.date >= range.startDate && event.date <= range.endDate)
      .map((event) => ({ ...event, calendarPrefix: eventTypeLabel(event) })),
  };
}

export function generateCalendarIcs(events: CommunityEvent[], calendarName = 'Pasban-e-Aza Schedule') {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'PRODID:-//Pasban-e-Aza//Schedule//EN',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    `X-WR-TIMEZONE:${HOUSTON_TIME_ZONE}`,
  ];

  for (const event of events) {
    const startMinutes = parseEventTime(event.time);
    const title = `${event.contactName || event.title}${event.title && event.contactName ? ` - ${event.title}` : ''}`;
    const description = [
      event.islamicDate ? `Islamic date: ${event.islamicDate}` : '',
      event.isAnjumanSchedule ? 'Anjuman schedule: Yes' : 'Community schedule',
      event.socialUrl ? `Link: ${event.socialUrl}` : '',
      `Pasban Event ID: ${event.id}`,
    ].filter(Boolean).join('\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:pasban-${escapeIcsText(event.id)}@pasbaneaza.org`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`SUMMARY:${escapeIcsText(title || 'Pasban-e-Aza Event')}`);
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    if (event.address) lines.push(`LOCATION:${escapeIcsText(event.address)}`);
    if (event.socialUrl) lines.push(`URL:${escapeIcsText(event.socialUrl)}`);

    if (startMinutes === null) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(event.date)}`);
      lines.push(`DTEND;VALUE=DATE:${formatIcsDate(addDays(event.date, 1))}`);
    } else {
      lines.push(`DTSTART;TZID=${HOUSTON_TIME_ZONE}:${formatIcsDateTime(event.date, startMinutes)}`);
      lines.push(`DTEND;TZID=${HOUSTON_TIME_ZONE}:${formatIcsDateTime(event.date, startMinutes + DEFAULT_DURATION_MINUTES)}`);
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function downloadIcsFile(ics: string, filename: string) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return true;
}

export async function syncEventsToDeviceCalendar(events: CommunityEvent[]) {
  if (!events.length) return { ok: false, message: 'No visible events to sync.' };

  if (Platform.OS === 'web') {
    const ics = generateCalendarIcs(events);
    downloadIcsFile(ics, 'pasbaneaza-calendar.ics');
    return { ok: true, message: 'Calendar file downloaded. Open it on your phone or calendar app to import.' };
  }

  const Calendar = await import('expo-calendar/legacy');
  const permission = await Calendar.requestCalendarPermissionsAsync();

  if (permission.status !== 'granted') {
    return { ok: false, message: 'Calendar permission was not granted.' };
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const calendarId = await getWritableCalendarId(Calendar, calendars);

  if (!calendarId) {
    return { ok: false, message: 'No writable local calendar was found.' };
  }

  const range = getEventDateRange(events);
  const existingEvents = await Calendar.getEventsAsync([calendarId], parseNativeDate(range.start), parseNativeDate(addDays(range.end, 1)));
  const existingIds = new Set(
    existingEvents
      .map((event) => String(event.notes || '').match(/Pasban Event ID: ([^\s]+)/)?.[1])
      .filter(Boolean),
  );

  let created = 0;
  for (const event of events) {
    if (existingIds.has(event.id)) continue;
    await Calendar.createEventAsync(calendarId, nativeEventPayload(event));
    created += 1;
  }

  return {
    ok: true,
    message: created === 0 ? 'Visible events are already on your device calendar.' : `Added ${created} event${created === 1 ? '' : 's'} to your device calendar.`,
  };
}

function parseDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function parseNativeDate(dateString: string, minutes = 0) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDisplayDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function getDateSpan(startDate: string, endDate: string) {
  const dates: string[] = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function daysBetween(startDate: string, endDate: string) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

function eventTypeLabel(event: CommunityEvent) {
  if (event.isAnjumanSchedule) return 'Anjuman';
  if (event.type === 'W') return 'Sisters';
  if (event.type === 'M') return 'Brothers';
  if (event.type === 'F' || event.type === 'A') return 'Family';
  return 'Community';
}

function escapeIcsText(value: unknown) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function parseEventTime(value: unknown) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  return ((hour % 12) + (meridiem === 'PM' ? 12 : 0)) * 60 + minute;
}

function formatIcsDate(dateString: string) {
  return dateString.replace(/-/g, '');
}

function formatIcsDateTime(dateString: string, minutes: number) {
  const dayOffset = Math.floor(minutes / 1440);
  const day = addDays(dateString, dayOffset);
  const minuteOfDay = minutes % 1440;
  const hour = String(Math.floor(minuteOfDay / 60)).padStart(2, '0');
  const minute = String(minuteOfDay % 60).padStart(2, '0');
  return `${formatIcsDate(day)}T${hour}${minute}00`;
}

function getEventDateRange(events: CommunityEvent[]) {
  const dates = events.map((event) => event.date).sort();
  return {
    start: dates[0] || getHoustonDate(),
    end: dates[dates.length - 1] || getHoustonDate(),
  };
}

async function getWritableCalendarId(
  Calendar: typeof import('expo-calendar/legacy'),
  calendars: import('expo-calendar/legacy').Calendar[],
) {
  const existing = calendars.find((calendar) => calendar.title === 'Pasban-e-Aza' && calendar.allowsModifications);
  if (existing) return existing.id;

  const writable = calendars.find((calendar) => calendar.allowsModifications);
  if (!writable) return null;

  try {
    return await Calendar.createCalendarAsync({
      title: 'Pasban-e-Aza',
      name: 'Pasban-e-Aza',
      color: '#d4a83c',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: writable.source?.id,
      source: writable.source,
      ownerAccount: 'Pasban-e-Aza',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  } catch {
    return writable.id;
  }
}

function nativeEventPayload(event: CommunityEvent) {
  const startMinutes = parseEventTime(event.time);
  const startDate = startMinutes === null ? parseNativeDate(event.date) : parseNativeDate(event.date, startMinutes);
  const endDate = startMinutes === null ? parseNativeDate(addDays(event.date, 1)) : parseNativeDate(event.date, startMinutes + DEFAULT_DURATION_MINUTES);
  const title = `${event.contactName || event.title}${event.title && event.contactName ? ` - ${event.title}` : ''}`;

  return {
    title: title || 'Pasban-e-Aza Event',
    startDate,
    endDate,
    timeZone: HOUSTON_TIME_ZONE,
    location: event.address || undefined,
    notes: [
      event.islamicDate ? `Islamic date: ${event.islamicDate}` : '',
      event.isAnjumanSchedule ? 'Anjuman schedule: Yes' : 'Community schedule',
      event.socialUrl ? `Link: ${event.socialUrl}` : '',
      `Pasban Event ID: ${event.id}`,
    ].filter(Boolean).join('\n'),
    url: event.socialUrl || undefined,
    allDay: startMinutes === null,
  };
}
