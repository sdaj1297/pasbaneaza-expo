const HOUSTON_TIME_ZONE = 'America/Chicago';

function getHoustonDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HOUSTON_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function getDisplayDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function getHoustonDateTime(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HOUSTON_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day} ${byType.hour}:${byType.minute}:${byType.second}`;
}

module.exports = {
  HOUSTON_TIME_ZONE,
  getDisplayDate,
  getHoustonDate,
  getHoustonDateTime,
};
