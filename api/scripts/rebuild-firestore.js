require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const { pool } = require('../db');
const { extractFirstImageUrl, stripHtml } = require('../utils/text');

const PRESERVED_BANNER_ID = 'beta-shab-e-aza-2026';
const EXCLUDED_ANNOUNCEMENT_ID = '9';
const EXPECTED_COUNTS = {
  events: 2368,
  eventDetails: 1553,
  centers: 10,
  specialEvents: 5,
  announcements: 8,
  islamicCalendar: 21,
  islamicEvents: 87,
  sayings: 12,
};
const BATCH_LIMIT = 400;

function parseCommand(value) {
  const command = value || 'dry-run';
  if (!['backup', 'dry-run', 'apply', 'verify'].includes(command)) {
    throw new Error('Usage: node api/scripts/rebuild-firestore.js <backup|dry-run|apply|verify>');
  }
  return command;
}

function getAdminDb() {
  if (!getApps().length) {
    const serviceAccountFile = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountFile && !serviceAccountJson) {
      throw new Error('Set FIREBASE_SERVICE_ACCOUNT_FILE or FIREBASE_SERVICE_ACCOUNT_JSON.');
    }
    const serviceAccount = serviceAccountJson
      ? JSON.parse(serviceAccountJson)
      : JSON.parse(fs.readFileSync(path.resolve(serviceAccountFile), 'utf8'));
    initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
  }
  return getFirestore();
}

function clean(value) {
  return String(value ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function dateValue(value) {
  return value ? String(value).slice(0, 10) : '';
}

function dateTimeValue(value) {
  return value ? String(value).slice(0, 19).replace('T', ' ') : '';
}

function timeToMinutes(value) {
  const match = clean(value).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  return ((Number(match[1]) % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(match[2]);
}

function absoluteLegacyUrl(value) {
  const url = clean(value);
  if (!url || /^https?:\/\//i.test(url)) return url;
  return `https://pasbaneaza.org/${url.replace(/^\/+/, '')}`;
}

class BatchWriter {
  constructor(db) {
    this.db = db;
    this.batch = db.batch();
    this.pending = 0;
    this.total = 0;
  }

  set(ref, data, options) {
    if (options) this.batch.set(ref, data, options);
    else this.batch.set(ref, data);
    this.pending += 1;
    this.total += 1;
  }

  async flushIfNeeded() {
    if (this.pending >= BATCH_LIMIT) await this.flush();
  }

  async flush() {
    if (!this.pending) return;
    await this.batch.commit();
    this.batch = this.db.batch();
    this.pending = 0;
  }
}

async function buildSnapshot() {
  const [
    eventResult,
    detailResult,
    centerResult,
    specialEventResult,
    announcementResult,
    calendarResult,
    islamicEventResult,
    sayingResult,
    orphanResult,
  ] = await Promise.all([
    pool.query(
      `select
         e.PKID id, e.EVENT_NAME title, e.CONTACT_NAME contact_name,
         date_format(e.EVENT_DATE, '%Y-%m-%d') event_date,
         date_format(e.EVENT_DATE, '%l:%i %p') event_time,
         e.ETYPE event_type, e.FLYER flyer, e.SOCIALURL social_url,
         e.PUBLISH is_published, e.PLACE_HOLDER is_placeholder,
         e.WAITING_APPROVAL waiting_approval, e.ADDTOSCHD is_anjuman_schedule,
         e.ANJUMANSCHD anjuman_schedule_code, e.CENTERID center_id,
         e.LOC_NAME location_name, e.LOC_ADDRESS1 loc_address1,
         e.LOC_ADDRESS2 loc_address2, e.LOC_CITY loc_city,
         e.LOC_STATE loc_state, e.LOC_ZIP loc_zip,
         c.CENTER_NAME center_name, c.IS_CENTER is_center,
         c.ADDRESS1 center_address1, c.ADDRESS2 center_address2,
         c.CITY center_city, c.STATE center_state, c.ZIP center_zip
       from EVENTS e left join CENTERS c on c.PKID = e.CENTERID
       order by e.EVENT_DATE, e.PKID`,
    ),
    pool.query(
      `select PKID id, EVENTID event_id, PROG_TYPE program_type,
              PROG_TIME program_time, PROG_SPEAKER speaker
       from EVENTS_DETAIL order by EVENTID, PKID`,
    ),
    pool.query(
      `select PKID id, CENTER_NAME name, IS_CENTER is_center, ADDRESS1 address1,
              ADDRESS2 address2, CITY city, STATE state, ZIP zip,
              PUBLISH is_published, CENTER_CITYID city_id, DISPLAY_ORDER display_order
       from CENTERS order by DISPLAY_ORDER, PKID`,
    ),
    pool.query(
      `select PKID id, date_format(EVENT_DATE, '%Y-%m-%d') event_date,
              date_format(EVENT_DATE, '%l:%i %p') event_time,
              EVENT_DESC description, EVENT_COLOR color, EVENT_FLYER flyer
       from ANJUMAN_EVENTS order by EVENT_DATE, PKID`,
    ),
    pool.query(
      `select PKID id, DISPLAY_TITLE title, ANNOUNCEMENT html,
              date_format(POST_FROM, '%Y-%m-%d %H:%i:%s') post_from,
              date_format(POST_UNTIL, '%Y-%m-%d %H:%i:%s') post_until,
              DISPLAY_ORDER display_order, FULL_PAGE full_page
       from ANNOUNCEMENTS order by DISPLAY_ORDER, PKID`,
    ),
    pool.query(
      `select PKID id, LUNAR_YEAR lunar_year,
              date_format(FIRST_DATE, '%Y-%m-%d') first_date,
              MUHARRAM, SAFAR, RABIA_AWAL, RABIA_THANI, JAMADIAL_AWAL,
              JAMADIAL_THANI, RAJAB, SHABAN, RAMAZAN, SHAWWAL, ZILQADAH, ZILHAJ
       from ISLAMIC_CALENDAR order by FIRST_DATE`,
    ),
    pool.query(
      `select PKID id, IMONTH month, IDAY day, IEVENT title,
              EVENT_DESC description, ICOLOR color, IS_ACTIVE is_active
       from ISLAMIC_EVENTS order by IMONTH, IDAY, PKID`,
    ),
    pool.query(
      `select PKID id, WHO author, SAYING saying, IS_ACTIVE is_active
       from SAYINGS order by PKID`,
    ),
    pool.query(
      `select count(*) orphan_count
       from EVENTS_DETAIL d left join EVENTS e on e.PKID = d.EVENTID
       where e.PKID is null`,
    ),
  ]);

  const programsByEvent = new Map();
  for (const row of detailResult[0]) {
    const eventId = String(row.event_id);
    const programs = programsByEvent.get(eventId) || [];
    programs.push({
      id: String(row.id),
      type: clean(row.program_type),
      time: clean(row.program_time),
      speaker: clean(row.speaker),
    });
    programsByEvent.set(eventId, programs);
  }

  const events = eventResult[0].map((row) => {
    const useCenter = Number(row.is_center) === 1;
    const address = useCenter
      ? [row.center_address1, row.center_address2, row.center_city, row.center_state, row.center_zip]
      : [row.loc_address1, row.loc_address2, row.loc_city, row.loc_state, row.loc_zip];
    const id = String(row.id);
    const time = clean(row.event_time);
    return {
      id,
      eventId: id,
      title: clean(row.title) || 'Majlis',
      contactName: clean(row.contact_name) || clean(row.title) || 'Pasban-e-Aza',
      date: dateValue(row.event_date),
      time,
      sortTime: timeToMinutes(time),
      islamicDate: '',
      type: clean(row.event_type || 'F'),
      locationName: clean(useCenter ? row.center_name : row.location_name || 'Residence'),
      address: address.map(clean).filter(Boolean).join(', '),
      flyer: clean(row.flyer),
      socialUrl: clean(row.social_url),
      centerId: String(row.center_id || ''),
      isAnjumanSchedule: Number(row.is_anjuman_schedule) === 1,
      addToSchedule: Number(row.is_anjuman_schedule) === 1,
      anjumanScheduleCode: Number(row.anjuman_schedule_code || 0),
      isPublished: Number(row.is_published) === 1,
      publish: Number(row.is_published) === 1,
      waitingApproval: Number(row.waiting_approval) === 1,
      isPlaceholder: Number(row.is_placeholder) === 1,
      program: programsByEvent.get(id) || [],
      source: 'prod-mysql',
    };
  });

  const monthDefinitions = [
    ['MUHARRAM', 'Muharram'],
    ['SAFAR', 'Safar'],
    ['RABIA_AWAL', 'Rabi al-Awwal'],
    ['RABIA_THANI', 'Rabi al-Thani'],
    ['JAMADIAL_AWAL', 'Jumada al-Awwal'],
    ['JAMADIAL_THANI', 'Jumada al-Thani'],
    ['RAJAB', 'Rajab'],
    ['SHABAN', 'Shaban'],
    ['RAMAZAN', 'Ramadan'],
    ['SHAWWAL', 'Shawwal'],
    ['ZILQADAH', 'Dhu al-Qadah'],
    ['ZILHAJ', 'Dhu al-Hijjah'],
  ];

  const announcements = announcementResult[0].map((row) => {
    const imageUrl = absoluteLegacyUrl(extractFirstImageUrl(row.html));
    return {
      id: String(row.id),
      title: clean(row.title),
      body: stripHtml(row.html),
      html: String(row.html || ''),
      imageUrl,
      flyerUrl: imageUrl,
      postFrom: dateTimeValue(row.post_from),
      postUntil: dateTimeValue(row.post_until),
      startsAt: dateValue(row.post_from),
      endsAt: dateValue(row.post_until),
      displayOrder: Number(row.display_order || 0),
      fullPage: Number(row.full_page) === 1,
      isActive: true,
      isFeatured: Number(row.full_page) === 1,
      eyebrow: Number(row.full_page) === 1 ? 'Featured Event' : 'Announcement',
      source: 'prod-mysql',
    };
  });

  const snapshot = {
    events,
    eventDetails: detailResult[0],
    centers: centerResult[0].map((row) => ({
      id: String(row.id),
      name: clean(row.name),
      isCenter: Number(row.is_center) === 1,
      address: [row.address1, row.address2, row.city, row.state, row.zip].map(clean).filter(Boolean).join(', '),
      isPublished: Number(row.is_published) === 1,
      cityId: Number(row.city_id || 0),
      displayOrder: Number(row.display_order || 0),
      source: 'prod-mysql',
    })),
    specialEvents: specialEventResult[0].map((row) => ({
      id: String(row.id),
      date: dateValue(row.event_date),
      time: clean(row.event_time),
      title: clean(row.description),
      color: clean(row.color),
      flyerUrl: absoluteLegacyUrl(row.flyer),
      source: 'prod-mysql',
    })),
    announcements,
    islamicCalendar: calendarResult[0].map((row) => ({
      id: String(row.lunar_year),
      legacyId: String(row.id),
      year: Number(row.lunar_year),
      firstDate: dateValue(row.first_date),
      months: monthDefinitions.map(([key, name], index) => ({
        index: index + 1,
        key,
        name,
        length: Number(row[key] || 0),
      })),
      source: 'prod-mysql',
    })),
    islamicEvents: islamicEventResult[0].map((row) => ({
      id: String(row.id),
      month: Number(row.month),
      day: Number(row.day),
      title: clean(row.title),
      description: clean(row.description),
      color: clean(row.color),
      isActive: Number(row.is_active) === 1,
      source: 'prod-mysql',
    })),
    sayings: sayingResult[0].map((row) => ({
      id: String(row.id),
      who: clean(row.author),
      saying: clean(row.saying),
      isActive: Number(row.is_active) === 1,
      source: 'prod-mysql',
    })),
    orphanEventDetails: Number(orphanResult[0][0].orphan_count || 0),
  };

  snapshot.counts = {
    events: snapshot.events.length,
    eventDetails: snapshot.eventDetails.length,
    centers: snapshot.centers.length,
    specialEvents: snapshot.specialEvents.length,
    announcements: snapshot.announcements.length,
    islamicCalendar: snapshot.islamicCalendar.length,
    islamicEvents: snapshot.islamicEvents.length,
    sayings: snapshot.sayings.length,
  };
  snapshot.hash = crypto.createHash('sha256').update(JSON.stringify(snapshot.counts)).digest('hex');
  return snapshot;
}

function validateSnapshot(snapshot) {
  const errors = [];
  for (const [dataset, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (snapshot.counts[dataset] !== expected) {
      errors.push(`${dataset}: expected ${expected}, found ${snapshot.counts[dataset]}`);
    }
  }
  if (snapshot.orphanEventDetails !== 0) errors.push(`${snapshot.orphanEventDetails} orphan event-detail rows`);
  if (snapshot.events.some((event) => !event.date)) errors.push('One or more events have no date');
  if (snapshot.events.filter((event) => event.id === '4378').length !== 1) {
    errors.push('Expected exactly one Shab-e-Aza event 4378');
  }
  if (!snapshot.announcements.some((announcement) => announcement.id === EXCLUDED_ANNOUNCEMENT_ID)) {
    errors.push('SQL Shab-e-Aza announcement 9 was not found');
  }
  if (errors.length) throw new Error(`Snapshot validation failed:\n- ${errors.join('\n- ')}`);
}

function serializeFirestoreValue(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);
  if (Buffer.isBuffer(value)) return { __type: 'bytes', base64: value.toString('base64') };
  if (typeof value !== 'object') return value;
  if (typeof value.toDate === 'function') return { __type: 'timestamp', value: value.toDate().toISOString() };
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeFirestoreValue(item)]));
}

async function collectFirestoreDocuments(db) {
  const documents = [];
  async function walkCollection(collectionRef) {
    const snapshot = await collectionRef.get();
    for (const document of snapshot.docs) {
      documents.push({ path: document.ref.path, data: serializeFirestoreValue(document.data()) });
      for (const subcollection of await document.ref.listCollections()) await walkCollection(subcollection);
    }
  }
  for (const collection of await db.listCollections()) await walkCollection(collection);
  return documents;
}

async function backupFirestore(db) {
  const documents = await collectFirestoreDocuments(db);
  const payload = {
    projectId: process.env.FIREBASE_PROJECT_ID || 'pasbaneaza-beta',
    exportedAt: new Date().toISOString(),
    documentCount: documents.length,
    documents,
  };
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(os.homedir(), 'Downloads', `pasbaneaza-firestore-backup-${timestamp}.json.gz`);
  const content = zlib.gzipSync(JSON.stringify(payload));
  fs.writeFileSync(target, content);
  return {
    path: target,
    documentCount: documents.length,
    bytes: content.length,
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
  };
}

async function clearFirestore(db) {
  const collections = await db.listCollections();
  for (const collection of collections) await db.recursiveDelete(collection);
  return collections.map((collection) => collection.id);
}

async function writeCanonicalData(db, snapshot, preservedBanner) {
  const writer = new BatchWriter(db);
  const days = new Map();

  for (const event of snapshot.events) {
    const payload = { ...event, importedAt: FieldValue.serverTimestamp() };
    writer.set(db.collection('events').doc(event.id), payload);
    writer.set(db.collection('eventDays').doc(event.date).collection('items').doc(event.id), payload);
    const events = days.get(event.date) || [];
    events.push(event);
    days.set(event.date, events);
    await writer.flushIfNeeded();
  }
  for (const [date, events] of days.entries()) {
    writer.set(db.collection('eventDays').doc(date), {
      date,
      eventCount: events.length,
      anjumanCount: events.filter((event) => event.isAnjumanSchedule).length,
      source: 'prod-mysql',
      importedAt: FieldValue.serverTimestamp(),
    });
    await writer.flushIfNeeded();
  }
  for (const center of snapshot.centers) {
    writer.set(db.collection('centers').doc(center.id), { ...center, importedAt: FieldValue.serverTimestamp() });
    await writer.flushIfNeeded();
  }
  for (const event of snapshot.specialEvents) {
    writer.set(db.collection('specialEvents').doc(event.id), { ...event, importedAt: FieldValue.serverTimestamp() });
    await writer.flushIfNeeded();
  }
  for (const year of snapshot.islamicCalendar) {
    writer.set(db.collection('islamicCalendar').doc(year.id), { ...year, importedAt: FieldValue.serverTimestamp() });
    await writer.flushIfNeeded();
  }
  for (const event of snapshot.islamicEvents) {
    writer.set(db.collection('islamicEvents').doc(event.id), { ...event, importedAt: FieldValue.serverTimestamp() });
    await writer.flushIfNeeded();
  }

  const importedAnnouncements = snapshot.announcements.filter(
    (announcement) => announcement.id !== EXCLUDED_ANNOUNCEMENT_ID,
  );
  for (const announcement of importedAnnouncements) {
    writer.set(db.collection('banners').doc(announcement.id), {
      ...announcement,
      importedAt: FieldValue.serverTimestamp(),
    });
    await writer.flushIfNeeded();
  }
  writer.set(db.collection('banners').doc(PRESERVED_BANNER_ID), preservedBanner);

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  writer.set(db.collection('settings').doc('home'), {
    announcements: importedAnnouncements.filter(
      (announcement) => announcement.postFrom <= now && announcement.postUntil >= now,
    ),
    sayings: snapshot.sayings,
    importedAt: FieldValue.serverTimestamp(),
    source: 'prod-mysql',
  });
  writer.set(db.collection('settings').doc('migration'), {
    source: 'pasbaaza_pasbaneaza_org_db.sql.zip',
    sourceGeneratedAt: '2026-07-29T23:36:00-05:00',
    counts: snapshot.counts,
    sourceHash: snapshot.hash,
    preservedBannerId: PRESERVED_BANNER_ID,
    excludedAnnouncementId: EXCLUDED_ANNOUNCEMENT_ID,
    importedAt: FieldValue.serverTimestamp(),
  });

  await writer.flush();
  return { writes: writer.total, eventDays: days.size, importedAnnouncements: importedAnnouncements.length };
}

async function verifyFirestore(db, snapshot) {
  const [
    eventCount,
    eventDayCount,
    eventDayItemCount,
    centerCount,
    specialEventCount,
    bannerCount,
    calendarCount,
    islamicEventCount,
    settingsHome,
    migration,
    preservedBanner,
    duplicateBetaShab,
    shabEvent,
  ] = await Promise.all([
    db.collection('events').count().get(),
    db.collection('eventDays').count().get(),
    db.collectionGroup('items').count().get(),
    db.collection('centers').count().get(),
    db.collection('specialEvents').count().get(),
    db.collection('banners').count().get(),
    db.collection('islamicCalendar').count().get(),
    db.collection('islamicEvents').count().get(),
    db.collection('settings').doc('home').get(),
    db.collection('settings').doc('migration').get(),
    db.collection('banners').doc(PRESERVED_BANNER_ID).get(),
    db.collection('events').doc('beta-shab-e-aza-2026-08-08').get(),
    db.collection('events').doc('4378').get(),
  ]);
  const actual = {
    events: eventCount.data().count,
    eventDays: eventDayCount.data().count,
    eventDayItems: eventDayItemCount.data().count,
    centers: centerCount.data().count,
    specialEvents: specialEventCount.data().count,
    banners: bannerCount.data().count,
    islamicCalendar: calendarCount.data().count,
    islamicEvents: islamicEventCount.data().count,
  };
  const eventDocuments = await db.collection('events').get();
  const bannedKeys = ['email', 'phone', 'cell', 'password', 'session'];
  const piiFields = eventDocuments.docs.flatMap((document) => (
    Object.keys(document.data())
      .filter((key) => bannedKeys.some((term) => key.toLowerCase().includes(term)))
      .map((key) => `${document.id}.${key}`)
  ));
  const attachedEventDetails = eventDocuments.docs.reduce(
    (total, document) => total + (Array.isArray(document.data().program) ? document.data().program.length : 0),
    0,
  );
  const checks = {
    eventCount: actual.events === snapshot.counts.events,
    eventDayItemCount: actual.eventDayItems === snapshot.counts.events,
    attachedEventDetailCount: attachedEventDetails === snapshot.counts.eventDetails,
    centerCount: actual.centers === snapshot.counts.centers,
    specialEventCount: actual.specialEvents === snapshot.counts.specialEvents,
    bannerCount: actual.banners === snapshot.counts.announcements,
    islamicCalendarCount: actual.islamicCalendar === snapshot.counts.islamicCalendar,
    islamicEventCount: actual.islamicEvents === snapshot.counts.islamicEvents,
    homeSettings: settingsHome.exists,
    migrationMetadata: migration.exists && migration.data().sourceHash === snapshot.hash,
    preservedBanner: preservedBanner.exists,
    duplicateBetaShabRemoved: !duplicateBetaShab.exists,
    canonicalShabEvent: shabEvent.exists
      && shabEvent.data().date === '2026-08-08'
      && shabEvent.data().isAnjumanSchedule === true,
    noPiiFields: piiFields.length === 0,
  };
  return {
    passed: Object.values(checks).every(Boolean),
    expected: snapshot.counts,
    actual,
    attachedEventDetails,
    checks,
    piiFields,
  };
}

async function main() {
  const command = parseCommand(process.argv[2]);
  const db = getAdminDb();
  if (command === 'backup') {
    console.log(JSON.stringify(await backupFirestore(db), null, 2));
    return;
  }

  const snapshot = await buildSnapshot();
  validateSnapshot(snapshot);
  if (command === 'dry-run') {
    const banner = await db.collection('banners').doc(PRESERVED_BANNER_ID).get();
    console.log(JSON.stringify({
      dryRun: true,
      counts: snapshot.counts,
      orphanEventDetails: snapshot.orphanEventDetails,
      shabEvent: snapshot.events.find((event) => event.id === '4378'),
      preservedBannerFound: banner.exists,
      excludedAnnouncementFound: snapshot.announcements.some(
        (announcement) => announcement.id === EXCLUDED_ANNOUNCEMENT_ID,
      ),
    }, null, 2));
    return;
  }
  if (command === 'verify') {
    const verification = await verifyFirestore(db, snapshot);
    console.log(JSON.stringify(verification, null, 2));
    if (!verification.passed) process.exitCode = 1;
    return;
  }

  const preservedBannerSnapshot = await db.collection('banners').doc(PRESERVED_BANNER_ID).get();
  if (!preservedBannerSnapshot.exists) throw new Error(`Preserved banner ${PRESERVED_BANNER_ID} was not found.`);
  const backup = await backupFirestore(db);
  const clearedCollections = await clearFirestore(db);
  const writeResult = await writeCanonicalData(db, snapshot, preservedBannerSnapshot.data());
  const verification = await verifyFirestore(db, snapshot);
  console.log(JSON.stringify({ backup, clearedCollections, writeResult, verification }, null, 2));
  if (!verification.passed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
