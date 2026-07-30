import { CalculationParameters, Coordinates, PrayerTimes } from 'adhan';

import type { PrayerTime } from '@/data/mock';
import { getHoustonDate } from '@/lib/calendarUtils';

const HOUSTON_COORDINATES = new Coordinates(29.75996, -95.36253);
const HOUSTON_TIME_ZONE = 'America/Chicago';

// Matches the legacy PrayTime.php Jafari method: Fajr 16, Maghrib 4, Isha 14.
const JAFARI_PARAMETERS = new CalculationParameters('Other', 16, 14, 0, 4);

export function getHoustonPrayerTimes(date = getHoustonDate()): PrayerTime[] {
  const calculationDate = parseCalendarDate(date);
  const times = new PrayerTimes(HOUSTON_COORDINATES, calculationDate, JAFARI_PARAMETERS);

  return [
    { label: 'Fajr', time: formatHoustonTime(times.fajr) },
    { label: 'Sunrise', time: formatHoustonTime(times.sunrise) },
    { label: 'Zohr', time: formatHoustonTime(times.dhuhr) },
    { label: 'Sunset', time: formatHoustonTime(times.sunset) },
    { label: 'Maghrib', time: formatHoustonTime(times.maghrib) },
  ];
}

function parseCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

function formatHoustonTime(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: HOUSTON_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(value);
}
