import { getHoustonDate } from '@/lib/calendarUtils';

export type SelectOption = {
  label: string;
  value: string;
};

export const eventAudienceOptions: SelectOption[] = [
  { label: 'Family / Open', value: 'Family' },
  { label: 'Brothers', value: 'Brothers' },
  { label: 'Sisters only', value: 'Sisters' },
];

export const anjumanRequestOptions: SelectOption[] = [
  { label: 'No, community listing only', value: 'no' },
  { label: 'Yes, request Anjuman participation', value: 'yes' },
];

export function buildDateOptions(dayCount = 180): SelectOption[] {
  const today = getHoustonDate();
  const start = parseDate(today);

  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const value = toIsoDate(date);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    const label = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });

    return {
      label: index === 0 ? `Today / ${label}` : `${weekday}, ${label}`,
      value,
    };
  });
}

export function buildTimeOptions(): SelectOption[] {
  const options: SelectOption[] = [{ label: 'Time TBD', value: '' }];
  for (let minutes = 6 * 60; minutes <= 23 * 60 + 45; minutes += 15) {
    options.push({
      label: formatMinutes(minutes),
      value: formatMinutes(minutes),
    });
  }
  return options;
}

export function audienceToEventType(audience: string) {
  if (audience === 'Sisters') return 'W';
  if (audience === 'Family') return 'F';
  return 'M';
}

export function eventTypeToAudience(type: string) {
  if (type === 'W') return 'Sisters';
  if (type === 'F' || type === 'A') return 'Family';
  return 'Brothers';
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatMinutes(totalMinutes: number) {
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}
