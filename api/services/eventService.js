const { pool } = require('../db');
const { getHoustonDate } = require('../utils/dates');
const { cleanText } = require('../utils/text');
const { getIslamicDate } = require('./calendarService');

const allowedFilters = new Set(['all', 'anjuman', 'brothers', 'sisters', 'family']);

function eventSelect() {
  return `
    select
      e.PKID as id,
      e.EVENT_NAME as title,
      e.CONTACT_NAME as contactName,
      date_format(e.EVENT_DATE, '%Y-%m-%d') as eventDate,
      date_format(e.EVENT_DATE, '%l:%i %p') as eventTime,
      e.ETYPE as type,
      e.FLYER as flyer,
      e.SOCIALURL as socialUrl,
      e.PUBLISH as isPublished,
      e.PLACE_HOLDER as isPlaceholder,
      e.WAITING_APPROVAL as waitingApproval,
      e.ADDTOSCHD as isAnjumanSchedule,
      e.CENTERID as centerId,
      e.LOC_NAME as locationName,
      e.LOC_ADDRESS1 as locAddress1,
      e.LOC_ADDRESS2 as locAddress2,
      e.LOC_CITY as locCity,
      e.LOC_STATE as locState,
      e.LOC_ZIP as locZip,
      c.CENTER_NAME as centerName,
      c.IS_CENTER as isCenter,
      c.ADDRESS1 as centerAddress1,
      c.ADDRESS2 as centerAddress2,
      c.CITY as centerCity,
      c.STATE as centerState,
      c.ZIP as centerZip
    from EVENTS e
    join CENTERS c on e.CENTERID = c.PKID
  `;
}

function getFilterWhere(filter) {
  if (filter === 'anjuman') return ['e.ADDTOSCHD = 1'];
  if (filter === 'brothers') return ["e.ETYPE in ('M', 'F', 'A')"];
  if (filter === 'sisters') return ["e.ETYPE in ('W', 'F', 'A')"];
  if (filter === 'family') return ["e.ETYPE in ('F', 'A')"];
  return [];
}

function normalizeLimit(value, fallback = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), 250);
}

function normalizeEvent(row, islamicDateLabel = '') {
  const useCenter = Number(row.isCenter) === 1;
  const addressParts = useCenter
    ? [row.centerAddress1, row.centerAddress2, row.centerCity, row.centerState, row.centerZip]
    : [row.locAddress1, row.locAddress2, row.locCity, row.locState, row.locZip];

  return {
    id: String(row.id),
    title: cleanText(row.title),
    contactName: cleanText(row.contactName),
    date: row.eventDate,
    time: cleanText(row.eventTime),
    islamicDate: islamicDateLabel,
    type: cleanText(row.type || 'F'),
    locationName: cleanText(useCenter ? row.centerName : row.locationName || 'Residence'),
    address: addressParts.map(cleanText).filter(Boolean).join(', '),
    flyer: cleanText(row.flyer),
    socialUrl: cleanText(row.socialUrl),
    isAnjumanSchedule: Number(row.isAnjumanSchedule) === 1,
    isPublished: Number(row.isPublished) === 1,
    waitingApproval: Number(row.waitingApproval) === 1,
  };
}

async function attachIslamicDates(rows) {
  const uniqueDates = [...new Set(rows.map((row) => row.eventDate).filter(Boolean))];
  const labels = new Map();

  await Promise.all(
    uniqueDates.map(async (date) => {
      const islamicDate = await getIslamicDate(date);
      labels.set(date, islamicDate?.label || '');
    }),
  );

  return rows.map((row) => normalizeEvent(row, labels.get(row.eventDate)));
}

async function getEvents(options = {}) {
  const filter = allowedFilters.has(options.filter) ? options.filter : 'all';
  const fromDate = options.from || getHoustonDate();
  const toDate = options.to || '';
  const limit = normalizeLimit(options.limit);

  const where = [
    'e.PUBLISH = 1',
    'e.PLACE_HOLDER = 0',
    'e.WAITING_APPROVAL = 0',
    'date(e.EVENT_DATE) >= :fromDate',
    ...getFilterWhere(filter),
  ];
  const params = { fromDate, limit };

  if (toDate) {
    where.push('date(e.EVENT_DATE) <= :toDate');
    params.toDate = toDate;
  }

  const [rows] = await pool.query(
    `${eventSelect()} where ${where.join(' and ')} order by e.EVENT_DATE, e.PKID limit :limit`,
    params,
  );

  return attachIslamicDates(rows);
}

async function getEventsForDate(date, options = {}) {
  const filter = allowedFilters.has(options.filter) ? options.filter : 'all';
  const where = [
    'date(e.EVENT_DATE) = :date',
    'e.PUBLISH = 1',
    'e.PLACE_HOLDER = 0',
    'e.WAITING_APPROVAL = 0',
    ...getFilterWhere(filter),
  ];

  const [rows] = await pool.query(
    `${eventSelect()} where ${where.join(' and ')} order by e.EVENT_DATE, e.PKID`,
    { date },
  );

  return attachIslamicDates(rows);
}

async function getEventProgram(eventId) {
  const [rows] = await pool.query(
    `select
       PKID as id,
       PROG_TYPE as type,
       PROG_TIME as time,
       PROG_SPEAKER as speaker
     from EVENTS_DETAIL
     where EVENTID = :eventId
     order by PKID`,
    { eventId },
  );

  return rows.map((row) => ({
    id: String(row.id),
    type: cleanText(row.type),
    time: cleanText(row.time),
    speaker: cleanText(row.speaker),
  }));
}

async function getEventById(eventId) {
  const [rows] = await pool.query(
    `${eventSelect()}
     where e.PKID = :eventId
       and e.PUBLISH = 1
       and e.PLACE_HOLDER = 0
       and e.WAITING_APPROVAL = 0
     limit 1`,
    { eventId },
  );

  if (rows.length === 0) return null;

  const [event] = await attachIslamicDates(rows);
  const program = await getEventProgram(eventId);

  return {
    ...event,
    program,
  };
}

module.exports = {
  getEventById,
  getEvents,
  getEventsForDate,
  getEventProgram,
};
