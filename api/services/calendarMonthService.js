const { getEvents } = require('./eventService');
const { calculateIslamicDate, getAllIslamicEvents, getIslamicCalendarYears } = require('./calendarService');
const { getDisplayDate, getHoustonDate, HOUSTON_TIME_ZONE } = require('../utils/dates');

const DEFAULT_DURATION_MINUTES = 90;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = parseDate(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

function getMonthRange(dateString) {
  const date = parseDate(dateString || getHoustonDate());
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1, 12));
  const last = new Date(Date.UTC(year, month + 1, 0, 12));
  const monthStart = formatDate(first);
  const monthEnd = formatDate(last);
  const gridStart = addDays(monthStart, -first.getUTCDay());
  const gridEnd = addDays(monthEnd, 6 - last.getUTCDay());

  return {
    year,
    month: month + 1,
    label: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first),
    monthStart,
    monthEnd,
    gridStart,
    gridEnd,
  };
}

function getDateSpan(startDate, endDate) {
  const dates = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function eventTypeLabel(event) {
  if (event.isAnjumanSchedule) return 'Anjuman';
  if (event.type === 'W') return 'Sisters';
  if (event.type === 'M') return 'Brothers';
  if (event.type === 'F' || event.type === 'A') return 'Family';
  return 'Community';
}

function buildCalendarMonth(input) {
  const today = input.today || getHoustonDate();
  const range = getMonthRange(input.date || today);
  const eventBuckets = new Map();
  const islamicEvents = input.islamicEvents || [];
  const calendarYears = input.calendarYears || [];

  for (const event of input.events || []) {
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
    const observances = islamicDate
      ? islamicEvents.filter((event) => event.month === islamicDate.month && event.day === islamicDate.day)
      : [];

    return {
      date,
      dayOfMonth: parsed.getUTCDate(),
      weekday: DAY_NAMES[parsed.getUTCDay()],
      isCurrentMonth: date >= range.monthStart && date <= range.monthEnd,
      isToday: date === today,
      displayDate: getDisplayDate(date),
      islamicDate,
      islamicEvents: observances,
      events: eventBuckets.get(date) || [],
    };
  });

  return {
    month: {
      year: range.year,
      month: range.month,
      label: range.label,
      startDate: range.monthStart,
      endDate: range.monthEnd,
      gridStart: range.gridStart,
      gridEnd: range.gridEnd,
    },
    filter: input.filter || 'all',
    timezone: HOUSTON_TIME_ZONE,
    today,
    days,
    events: (input.events || []).filter((event) => event.date >= range.monthStart && event.date <= range.monthEnd),
  };
}

async function getCalendarMonth(input = {}) {
  const range = getMonthRange(input.date || getHoustonDate());
  const [events, calendarYears, islamicEvents] = await Promise.all([
    getEvents({
      filter: input.filter || 'all',
      from: range.gridStart,
      to: range.gridEnd,
      limit: input.limit || 250,
    }),
    getIslamicCalendarYears(),
    getAllIslamicEvents(),
  ]);

  return buildCalendarMonth({
    date: input.date,
    filter: input.filter,
    events,
    calendarYears,
    islamicEvents,
  });
}

function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function parseEventTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  return ((hour % 12) + (meridiem === 'PM' ? 12 : 0)) * 60 + minute;
}

function formatIcsDate(dateString) {
  return dateString.replace(/-/g, '');
}

function formatIcsDateTime(dateString, minutes) {
  const dayOffset = Math.floor(minutes / 1440);
  const day = addDays(dateString, dayOffset);
  const minuteOfDay = minutes % 1440;
  const hour = String(Math.floor(minuteOfDay / 60)).padStart(2, '0');
  const minute = String(minuteOfDay % 60).padStart(2, '0');
  return `${formatIcsDate(day)}T${hour}${minute}00`;
}

function buildIcsForEvents(events, options = {}) {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const calendarName = options.calendarName || 'Pasban-e-Aza Schedule';
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

async function getCalendarIcs(input = {}) {
  const range = input.from && input.to ? { monthStart: input.from, monthEnd: input.to } : getMonthRange(input.date || getHoustonDate());
  const events = await getEvents({
    filter: input.filter || 'all',
    from: range.monthStart,
    to: range.monthEnd,
    limit: input.limit || 250,
  });

  return buildIcsForEvents(events, {
    calendarName: input.filter === 'anjuman' ? 'Pasban-e-Aza Anjuman Schedule' : 'Pasban-e-Aza Schedule',
  });
}

module.exports = {
  buildCalendarMonth,
  buildIcsForEvents,
  getCalendarIcs,
  getCalendarMonth,
  getMonthRange,
};
