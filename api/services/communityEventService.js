const crypto = require('crypto');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const { getFirebaseAdminDb } = require('../firebaseAdmin');
const { getHoustonDate } = require('../utils/dates');
const { getStatusUpdatesOpenAt } = require('../utils/statusUpdateWindow');

const EVENT_AUDIENCES = new Map([
  ['Brothers', 'M'],
  ['Sisters', 'W'],
  ['Family', 'F'],
]);
const RATE_LIMIT_MS = 30_000;

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeCommunityEventInput(input) {
  const payload = input && typeof input.payload === 'object' ? input.payload : {};
  const name = cleanText(input.name, 120);
  const email = cleanText(input.email, 160).toLowerCase();
  const phone = cleanText(input.phone, 40);
  const message = cleanText(input.message, 2000);
  const title = cleanText(payload.eventTitle, 180);
  const date = cleanText(payload.eventDate, 10);
  const time = cleanText(payload.eventTime, 10).toUpperCase();
  const address = cleanText(payload.eventAddress, 240);
  const audience = cleanText(payload.eventAudience, 20);
  const requestsAnjuman = payload.requestsAnjuman === true;
  const honeypot = cleanText(input.website || payload.website, 120);

  if (honeypot) {
    const error = new Error('Unable to accept this submission.');
    error.status = 400;
    throw error;
  }

  const required = { name, email, phone, title, date, time, address, audience };
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([field]) => field);
  if (missing.length) {
    const error = new Error(`Missing required event fields: ${missing.join(', ')}.`);
    error.status = 400;
    throw error;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error('Enter a valid email address.');
    error.status = 400;
    throw error;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidCalendarDate(date)) {
    const error = new Error('Enter a valid event date.');
    error.status = 400;
    throw error;
  }

  const today = getHoustonDate();
  const latestDate = addYears(today, 3);
  if (date < today || date > latestDate) {
    const error = new Error(`Event date must be between ${today} and ${latestDate}.`);
    error.status = 400;
    throw error;
  }

  if (!/^(?:1[0-2]|[1-9]):[0-5]\d (?:AM|PM)$/.test(time)) {
    const error = new Error('Enter a valid event time.');
    error.status = 400;
    throw error;
  }

  const type = EVENT_AUDIENCES.get(audience);
  if (!type) {
    const error = new Error('Choose a valid event audience.');
    error.status = 400;
    throw error;
  }

  return {
    contact: { name, email, phone, message },
    event: { title, date, time, address, audience, type, requestsAnjuman },
  };
}

async function createCommunityEventSubmission(input, metadata = {}) {
  const normalized = normalizeCommunityEventInput(input);
  const db = getFirebaseAdminDb();
  await enforceRateLimit(db, metadata.ip);

  const submissionRef = db.collection('submissions').doc();
  const eventId = `community-${submissionRef.id}`;
  const eventRef = db.collection('events').doc(eventId);
  const eventDayRef = db.collection('eventDays').doc(normalized.event.date);
  const eventDayItemRef = eventDayRef.collection('items').doc(eventId);
  const now = FieldValue.serverTimestamp();
  const eventPayload = buildCommunityEventPayload(normalized, eventId, now);

  const batch = db.batch();
  batch.set(submissionRef, {
    type: 'event',
    ...normalized.contact,
    payload: {
      eventTitle: normalized.event.title,
      eventDate: normalized.event.date,
      eventTime: normalized.event.time,
      eventAddress: normalized.event.address,
      eventAudience: normalized.event.audience,
      requestsAnjuman: normalized.event.requestsAnjuman,
      eventId,
    },
    source: 'website',
    status: normalized.event.requestsAnjuman ? 'anjuman_pending' : 'published',
    createdAt: now,
  });
  batch.set(eventRef, eventPayload);
  batch.set(eventDayRef, {
    date: normalized.event.date,
    source: 'community',
    updatedAt: now,
  }, { merge: true });
  batch.set(eventDayItemRef, eventPayload);
  await batch.commit();

  return {
    id: submissionRef.id,
    eventId,
    type: 'event',
    status: normalized.event.requestsAnjuman ? 'published_anjuman_pending' : 'published',
  };
}

function buildCommunityEventPayload(normalized, eventId, now) {
  const statusUpdatesOpenAt = getStatusUpdatesOpenAt(
    normalized.event.date,
    normalized.event.time,
  );
  return {
    id: eventId,
    eventId,
    title: normalized.event.title,
    contactName: normalized.contact.name,
    date: normalized.event.date,
    time: normalized.event.time,
    sortTime: toSortTime(normalized.event.time),
    islamicDate: '',
    type: normalized.event.type,
    locationName: 'Residence',
    address: normalized.event.address,
    flyer: '',
    socialUrl: '',
    isAnjumanSchedule: false,
    addToSchedule: false,
    anjumanApprovalStatus: normalized.event.requestsAnjuman ? 'pending' : 'not_requested',
    isPublished: true,
    publish: true,
    waitingApproval: false,
    isPlaceholder: false,
    statusUpdatesOpenAt: statusUpdatesOpenAt ? Timestamp.fromDate(statusUpdatesOpenAt) : null,
    source: 'community',
    createdAt: now,
    updatedAt: now,
  };
}

async function enforceRateLimit(db, ip) {
  const normalizedIp = cleanText(ip, 100);
  if (!normalizedIp) return;

  const key = crypto.createHash('sha256').update(normalizedIp).digest('hex');
  const ref = db.collection('_submissionRateLimits').doc(key);
  const now = Date.now();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const lastSubmittedAt = snapshot.data()?.lastSubmittedAt;
    if (lastSubmittedAt?.toMillis && now - lastSubmittedAt.toMillis() < RATE_LIMIT_MS) {
      const error = new Error('Please wait a moment before submitting another event.');
      error.status = 429;
      throw error;
    }

    transaction.set(ref, {
      lastSubmittedAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + 24 * 60 * 60 * 1000),
    });
  });
}

function isValidCalendarDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function addYears(value, years) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year + years, month - 1, day));
  return date.toISOString().slice(0, 10);
}

function toSortTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 9999;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  return hour * 100 + Number(match[2]);
}

module.exports = {
  buildCommunityEventPayload,
  createCommunityEventSubmission,
  normalizeCommunityEventInput,
};
