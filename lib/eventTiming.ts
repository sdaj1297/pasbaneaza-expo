import type { CommunityEvent, StatusItem } from '@/data/mock';

const HOUSTON_TIME_ZONE = 'America/Chicago';
const activeStatuses = new Set(['Started', 'En Route', 'Delayed']);
const finishedStatuses = new Set(['Completed', 'Skipped']);

export function filterUpcomingEvents(
  events: CommunityEvent[],
  statuses: StatusItem[],
  now = new Date(),
) {
  const clock = getHoustonClock(now);
  const statusByEventId = new Map(statuses.map((item) => [item.id, item.status]));

  return [...events]
    .filter((event) => isUpcomingEvent(event, statusByEventId.get(event.id), clock))
    .sort(compareEvents);
}

export function selectNextCommittedEvent(
  events: CommunityEvent[],
  statuses: StatusItem[],
  now = new Date(),
) {
  const upcomingCommitted = filterUpcomingEvents(
    events.filter((event) => event.isAnjumanSchedule),
    statuses,
    now,
  );
  const statusByEventId = new Map(statuses.map((item) => [item.id, item.status]));

  return upcomingCommitted.find((event) => activeStatuses.has(statusByEventId.get(event.id) || ''))
    || upcomingCommitted[0];
}

export function isActiveMajlis(eventId: string, statuses: StatusItem[]) {
  const status = statuses.find((item) => item.id === eventId)?.status || '';
  return status === 'Started' || status === 'En Route';
}

function isUpcomingEvent(
  event: CommunityEvent,
  status: StatusItem['status'] | undefined,
  clock: HoustonClock,
) {
  if (event.date > clock.date) return true;
  if (event.date < clock.date) return false;
  if (status && finishedStatuses.has(status)) return false;
  if (status && activeStatuses.has(status)) return true;

  const eventMinutes = parseEventTime(event.time);
  return eventMinutes === null || eventMinutes >= clock.minutes;
}

function compareEvents(left: CommunityEvent, right: CommunityEvent) {
  if (left.date !== right.date) return left.date.localeCompare(right.date);
  return (parseEventTime(left.time) ?? Number.MAX_SAFE_INTEGER)
    - (parseEventTime(right.time) ?? Number.MAX_SAFE_INTEGER);
}

function parseEventTime(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = Number(match[1]) % 12;
  const minutes = Number(match[2] || 0);
  if (match[3].toUpperCase() === 'PM') hours += 12;
  return hours * 60 + minutes;
}

function getHoustonClock(now: Date): HoustonClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    timeZone: HOUSTON_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

type HoustonClock = {
  date: string;
  minutes: number;
};
