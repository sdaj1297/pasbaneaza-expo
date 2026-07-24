require('dotenv').config();

const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const { pool } = require('../db');
const { getActiveAnnouncements, getFeaturedAnnouncement, getSayings } = require('../services/contentService');
const { getEvents } = require('../services/eventService');
const { getHoustonDate } = require('../utils/dates');

const IMPORT_LIMIT = Number(process.env.FIRESTORE_IMPORT_LIMIT || 250);
const IMPORT_FROM_DATE = process.env.FIRESTORE_IMPORT_FROM_DATE || getHoustonDate();

function initFirebaseAdmin() {
  if (getApps().length) return getFirestore();

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      projectId,
    });
  } else {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  return getFirestore();
}

class BatchWriter {
  constructor(db) {
    this.db = db;
    this.batch = db.batch();
    this.count = 0;
    this.total = 0;
  }

  set(ref, data, options = { merge: true }) {
    this.batch.set(ref, data, options);
    this.count += 1;
    this.total += 1;
  }

  async flushIfNeeded() {
    if (this.count < 450) return;
    await this.flush();
  }

  async flush() {
    if (this.count === 0) return;
    await this.batch.commit();
    this.batch = this.db.batch();
    this.count = 0;
  }
}

function eventToFirestore(event) {
  return {
    ...event,
    sortTime: timeToMinutes(event.time),
    importedAt: FieldValue.serverTimestamp(),
    source: 'legacy-mysql',
  };
}

function bannerFromAnnouncement(announcement, featuredAnnouncementId) {
  const startDate = normalizeDate(announcement.postFrom);
  const endDate = normalizeDate(announcement.postUntil);

  return {
    title: announcement.title,
    eyebrow: announcement.fullPage ? 'Featured Event' : 'Announcement',
    dateLabel: '',
    description: announcement.body,
    html: announcement.html,
    flyerUrl: announcement.imageUrl || '',
    isActive: true,
    isFeatured: announcement.id === featuredAnnouncementId,
    startsAt: startDate,
    endsAt: endDate,
    displayOrder: announcement.displayOrder || 0,
    importedAt: FieldValue.serverTimestamp(),
    source: 'legacy-mysql',
  };
}

async function importFirestore() {
  const db = initFirebaseAdmin();
  const writer = new BatchWriter(db);
  const [events, announcements, featuredAnnouncement, sayings] = await Promise.all([
    getEvents({ filter: 'all', from: IMPORT_FROM_DATE, limit: IMPORT_LIMIT }),
    getActiveAnnouncements(20),
    getFeaturedAnnouncement(),
    getSayings(3),
  ]);

  const eventsByDate = new Map();

  for (const event of events) {
    const payload = eventToFirestore(event);
    const eventRef = db.collection('events').doc(event.id);
    const dayRef = db.collection('eventDays').doc(event.date);
    const dayItemRef = dayRef.collection('items').doc(event.id);

    writer.set(eventRef, payload);
    writer.set(dayItemRef, payload);

    const bucket = eventsByDate.get(event.date) || [];
    bucket.push(event);
    eventsByDate.set(event.date, bucket);

    await writer.flushIfNeeded();
  }

  for (const [date, dayEvents] of eventsByDate.entries()) {
    writer.set(db.collection('eventDays').doc(date), {
      date,
      eventCount: dayEvents.length,
      anjumanCount: dayEvents.filter((event) => event.isAnjumanSchedule).length,
      importedAt: FieldValue.serverTimestamp(),
      source: 'legacy-mysql',
    });
    await writer.flushIfNeeded();
  }

  for (const announcement of announcements) {
    writer.set(
      db.collection('banners').doc(announcement.id),
      bannerFromAnnouncement(announcement, featuredAnnouncement?.id),
    );
    await writer.flushIfNeeded();
  }

  writer.set(db.collection('settings').doc('home'), {
    announcements,
    sayings,
    importedAt: FieldValue.serverTimestamp(),
    source: 'legacy-mysql',
  });

  await writer.flush();

  return {
    importedEvents: events.length,
    importedDays: eventsByDate.size,
    importedBanners: announcements.length,
    importedSayings: sayings.length,
    writes: writer.total,
    fromDate: IMPORT_FROM_DATE,
  };
}

function normalizeDate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function timeToMinutes(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  const normalizedHour = (hour % 12) + (meridiem === 'PM' ? 12 : 0);
  return normalizedHour * 60 + minute;
}

if (require.main === module) {
  importFirestore()
    .then(async (result) => {
      console.log(JSON.stringify(result, null, 2));
      await pool.end();
    })
    .catch(async (error) => {
      console.error(error);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { importFirestore };
