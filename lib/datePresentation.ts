import type { IslamicDateInfo } from '@/lib/calendarUtils';

type GregorianDateStyle = 'short' | 'hero' | 'long';

const gregorianOptions: Record<GregorianDateStyle, Intl.DateTimeFormatOptions> = {
  short: {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  },
  hero: {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  },
  long: {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  },
};

const compactIslamicMonths: Record<number, string> = {
  1: 'Muh',
  2: 'Saf',
  3: 'R-Aw',
  4: 'R-Th',
  5: 'J-Aw',
  6: 'J-Th',
  7: 'Raj',
  8: 'Sha',
  9: 'Ram',
  10: 'Shaw',
  11: 'D-Q',
  12: 'D-H',
};

export function formatGregorianDate(
  dateString: string,
  style: GregorianDateStyle = 'short',
) {
  const date = parseDate(dateString);
  if (!date) return dateString || 'Date pending';

  return new Intl.DateTimeFormat('en-US', {
    ...gregorianOptions[style],
    timeZone: 'UTC',
  }).format(date);
}

export function getRelativeDateLabel(dateString: string, todayString: string) {
  const date = parseDate(dateString);
  const today = parseDate(todayString);
  if (!date || !today) return '';

  const difference = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (difference === 0) return 'Today';
  if (difference === 1) return 'Tomorrow';
  return '';
}

export function formatCompactIslamicDate(islamicDate: IslamicDateInfo | null) {
  if (!islamicDate) return '';
  const month = compactIslamicMonths[islamicDate.month] || islamicDate.monthName.slice(0, 4);
  return `${islamicDate.day} ${month}`;
}

function parseDate(dateString: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return null;

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
}
