const HOUSTON_TIME_ZONE = 'America/Chicago';
const PUBLIC_STATUS_LEAD_MINUTES = 30;

function getStatusUpdatesOpenAt(date, time) {
  const start = getHoustonEventStart(date, time);
  return start
    ? new Date(start.getTime() - PUBLIC_STATUS_LEAD_MINUTES * 60_000)
    : null;
}

function getHoustonEventStart(date, time) {
  const dateMatch = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = String(time || '').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  let hour = Number(timeMatch[1]) % 12;
  const minute = Number(timeMatch[2] || 0);
  if (timeMatch[3].toUpperCase() === 'PM') hour += 12;

  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = new Date(localAsUtc);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    candidate = new Date(localAsUtc - getHoustonOffsetMinutes(candidate) * 60_000);
  }
  return candidate;
}

function getHoustonOffsetMinutes(value) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone: HOUSTON_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(value);
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const representedAsUtc = Date.UTC(
    Number(fields.year),
    Number(fields.month) - 1,
    Number(fields.day),
    Number(fields.hour),
    Number(fields.minute),
    Number(fields.second),
  );
  return (representedAsUtc - value.getTime()) / 60_000;
}

module.exports = {
  getHoustonEventStart,
  getStatusUpdatesOpenAt,
  PUBLIC_STATUS_LEAD_MINUTES,
};
