require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const { pool } = require('../db');
const { getHoustonDate } = require('../utils/dates');
const { hashValue, indexRecords, runProductionSync } = require('../sync/prodMirror');

const FIRESTORE_BATCH_LIMIT = 400;

function parseArguments(argv) {
  const options = {
    command: argv[2] || 'dry-run',
    backupPath: '',
  };

  for (let index = 3; index < argv.length; index += 1) {
    if (argv[index] === '--backup' && argv[index + 1]) {
      options.backupPath = path.resolve(argv[index + 1]);
      index += 1;
    }
  }

  if (!['backup', 'dry-run', 'apply', 'verify'].includes(options.command)) {
    throw new Error('Usage: node api/scripts/import-production-snapshot.js <backup|dry-run|apply|verify> [--backup <path>]');
  }

  return options;
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

    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
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
    .trim();
}

function stripHtml(value) {
  return clean(String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '));
}

function timeToMinutes(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return ((hour % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + minute;
}

function dateValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function dateTimeValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 19).replace('T', ' ');
  return new Date(value).toISOString().slice(0, 19).replace('T', ' ');
}

async function buildProductionSnapshot(db) {
  const today = getHoustonDate();
  const [
    eventRows,
    programRows,
    centerRows,
    specialEventRows,
    announcementRows,
    calendarRows,
    islamicEventRows,
    sayingRows,
    prayerTimesDoc,
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
       from EVENTS e
       join CENTERS c on c.PKID = e.CENTERID
       where c.CENTER_CITYID = 1 and date(e.EVENT_DATE) >= ?
       order by e.EVENT_DATE, e.PKID`,
      [today],
    ),
    pool.query(
      `select d.PKID id, d.EVENTID event_id, d.PROG_TYPE program_type,
              d.PROG_TIME program_time, d.PROG_SPEAKER speaker
       from EVENTS_DETAIL d
       join EVENTS e on e.PKID = d.EVENTID
       where date(e.EVENT_DATE) >= ?
       order by d.EVENTID, d.PKID`,
      [today],
    ),
    pool.query(
      `select PKID id, CENTER_NAME name, IS_CENTER is_center, ADDRESS1 address1,
              ADDRESS2 address2, CITY city, STATE state, ZIP zip, PUBLISH is_published
       from CENTERS where CENTER_CITYID = 1 order by DISPLAY_ORDER, PKID`,
    ),
    pool.query(
      `select PKID id, date_format(EVENT_DATE, '%Y-%m-%d') event_date,
              date_format(EVENT_DATE, '%l:%i %p') event_time,
              EVENT_DESC description, EVENT_COLOR color, EVENT_FLYER flyer
       from ANJUMAN_EVENTS where date(EVENT_DATE) >= ? order by EVENT_DATE, PKID`,
      [today],
    ),
    pool.query(
      `select PKID id, DISPLAY_TITLE title, ANNOUNCEMENT html,
              date_format(POST_FROM, '%Y-%m-%d %H:%i:%s') post_from,
              date_format(POST_UNTIL, '%Y-%m-%d %H:%i:%s') post_until,
              DISPLAY_ORDER display_order, FULL_PAGE full_page
       from ANNOUNCEMENTS where date(POST_UNTIL) >= ? order by DISPLAY_ORDER, PKID`,
      [today],
    ),
    pool.query(
      `select LUNAR_YEAR lunar_year, date_format(FIRST_DATE, '%Y-%m-%d') first_date,
              MUHARRAM, SAFAR, RABIA_AWAL, RABIA_THANI, JAMADIAL_AWAL,
              JAMADIAL_THANI, RAJAB, SHABAN, RAMAZAN, SHAWWAL, ZILQADAH, ZILHAJ
       from ISLAMIC_CALENDAR order by FIRST_DATE`,
    ),
    pool.query(
      `select PKID id, IMONTH month, IDAY day, IEVENT title,
              EVENT_DESC description, ICOLOR color
       from ISLAMIC_EVENTS where IS_ACTIVE = 1 order by IMONTH, IDAY, PKID`,
    ),
    pool.query(
      `select PKID id, WHO author, SAYING saying
       from SAYINGS where IS_ACTIVE = 1 order by PKID`,
    ),
    db.collection('settings').doc('prayerTimes').get(),
  ]);

  const programs = new Map();
  for (const row of programRows[0]) {
    const eventId = String(row.event_id);
    const items = programs.get(eventId) || [];
    items.push({
      id: String(row.id),
      type: clean(row.program_type),
      time: clean(row.program_time),
      speaker: clean(row.speaker),
    });
    programs.set(eventId, items);
  }

  const events = eventRows[0].map((row) => {
    const useCenter = Number(row.is_center) === 1;
    const address = useCenter
      ? [row.center_address1, row.center_address2, row.center_city, row.center_state, row.center_zip]
      : [row.loc_address1, row.loc_address2, row.loc_city, row.loc_state, row.loc_zip];
    const id = String(row.id);
    const time = clean(row.event_time);

    return {
      id,
      title: clean(row.title),
      contactName: clean(row.contact_name),
      date: dateValue(row.event_date),
      time,
      sortTime: timeToMinutes(time),
      type: clean(row.event_type || 'F'),
      locationName: clean(useCenter ? row.center_name : row.location_name || 'Residence'),
      address: address.map(clean).filter(Boolean).join(', '),
      flyer: clean(row.flyer),
      socialUrl: clean(row.social_url),
      centerId: String(row.center_id),
      isAnjumanSchedule: Number(row.is_anjuman_schedule) === 1,
      anjumanScheduleCode: Number(row.anjuman_schedule_code || 0),
      isPublished: Number(row.is_published) === 1,
      waitingApproval: Number(row.waiting_approval) === 1,
      isPlaceholder: Number(row.is_placeholder) === 1,
      program: programs.get(id) || [],
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

  const storedPrayerTimes = prayerTimesDoc.exists ? prayerTimesDoc.data() : {};
  const datasets = {
    events,
    centers: centerRows[0].map((row) => ({
      id: String(row.id),
      name: clean(row.name),
      isCenter: Number(row.is_center) === 1,
      address: [row.address1, row.address2, row.city, row.state, row.zip].map(clean).filter(Boolean).join(', '),
      isPublished: Number(row.is_published) === 1,
    })),
    specialEvents: specialEventRows[0].map((row) => ({
      id: String(row.id),
      date: dateValue(row.event_date),
      time: clean(row.event_time),
      title: clean(row.description),
      color: clean(row.color),
      flyerUrl: clean(row.flyer)
        ? `https://pasbaneaza.org/${clean(row.flyer).replace(/^\/+/, '')}`
        : '',
    })),
    announcements: announcementRows[0].map((row) => ({
      id: String(row.id),
      title: clean(row.title),
      html: String(row.html || ''),
      body: stripHtml(row.html),
      postFrom: dateTimeValue(row.post_from),
      postUntil: dateTimeValue(row.post_until),
      displayOrder: Number(row.display_order || 0),
      fullPage: Number(row.full_page) === 1,
    })),
    islamicCalendar: calendarRows[0].map((row) => ({
      id: String(row.lunar_year),
      year: Number(row.lunar_year),
      firstDate: dateValue(row.first_date),
      months: monthDefinitions.map(([key, name], index) => ({
        index: index + 1,
        key,
        name,
        length: Number(row[key] || 0),
      })),
    })),
    islamicEvents: islamicEventRows[0].map((row) => ({
      id: String(row.id),
      month: Number(row.month),
      day: Number(row.day),
      title: clean(row.title),
      description: clean(row.description),
      color: clean(row.color),
    })),
    sayings: sayingRows[0].map((row) => ({
      id: String(row.id),
      who: clean(row.author),
      saying: clean(row.saying),
    })),
    prayerTimes: {
      date: dateValue(storedPrayerTimes.date) || today,
      location: clean(storedPrayerTimes.location) || 'Houston',
      times: Array.isArray(storedPrayerTimes.times)
        ? storedPrayerTimes.times.map((item) => ({
          label: clean(item.label),
          time: clean(item.time),
        }))
        : [],
    },
  };

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    timezone: 'America/Chicago',
    today,
    snapshotHash: hashValue(datasets),
    counts: Object.fromEntries(Object.entries(datasets).map(([key, value]) => [key, Array.isArray(value) ? value.length : 1])),
    datasets,
  };
}

function serializeFirestoreValue(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);
  if (Buffer.isBuffer(value)) return { __type: 'bytes', base64: value.toString('base64') };
  if (typeof value !== 'object') return value;
  if (typeof value.toDate === 'function') return { __type: 'timestamp', value: value.toDate().toISOString() };
  if (typeof value.latitude === 'number' && typeof value.longitude === 'number') {
    return { __type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  }
  if (typeof value.path === 'string' && value.firestore) return { __type: 'reference', path: value.path };

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, serializeFirestoreValue(item)]),
  );
}

async function collectFirestoreDocuments(db) {
  const documents = [];

  async function walkCollection(collectionRef) {
    const snapshot = await collectionRef.get();
    for (const document of snapshot.docs) {
      documents.push({
        path: document.ref.path,
        data: serializeFirestoreValue(document.data()),
      });
      const subcollections = await document.ref.listCollections();
      for (const subcollection of subcollections) await walkCollection(subcollection);
    }
  }

  const collections = await db.listCollections();
  for (const collection of collections) await walkCollection(collection);
  return documents;
}

function defaultBackupPath() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(os.homedir(), 'Downloads', `pasbaneaza-firestore-backup-${timestamp}.json.gz`);
}

async function backupFirestore(db, outputPath = '') {
  const documents = await collectFirestoreDocuments(db);
  const payload = {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'pasbaneaza-beta',
    exportedAt: new Date().toISOString(),
    documentCount: documents.length,
    documents,
  };
  const target = outputPath || defaultBackupPath();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, zlib.gzipSync(JSON.stringify(payload)));
  return {
    path: target,
    documentCount: documents.length,
    bytes: fs.statSync(target).size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex'),
  };
}

async function getDatasetComparison(db, snapshot) {
  const comparisons = {};
  const manifestedDatasets = new Set([
    'events',
    'centers',
    'specialEvents',
    'islamicCalendar',
    'islamicEvents',
  ]);
  for (const [dataset, records] of Object.entries(snapshot.datasets)) {
    if (!Array.isArray(records) || !manifestedDatasets.has(dataset)) continue;
    const manifest = await db.collection('prodSyncManifests').doc(dataset).get();
    const previous = manifest.exists ? manifest.data().records || {} : {};
    const next = indexRecords(records);
    comparisons[dataset] = {
      sourceRecords: records.length,
      changed: Object.keys(next).filter((id) => previous[id] !== next[id]).length,
      deleted: Object.keys(previous).filter((id) => !Object.prototype.hasOwnProperty.call(next, id)).length,
    };
  }
  return comparisons;
}

async function verifyImport(db, snapshot) {
  const expectedPublicEvents = snapshot.datasets.events.filter((event) => event.isPublished).length;
  const expectedApprovedEvents = snapshot.datasets.events.filter(
    (event) => event.isPublished && !event.waitingApproval && !event.isPlaceholder,
  ).length;
  const [mirror, events, calendar, islamicEvents, centers, state] = await Promise.all([
    db.collection('prodMirrorEvents').get(),
    db.collection('events').where('source', '==', 'prod-mysql').get(),
    db.collection('islamicCalendar').get(),
    db.collection('islamicEvents').get(),
    db.collection('centers').get(),
    db.collection('prodSyncState').doc('current').get(),
  ]);

  const result = {
    expectedMirrorEvents: snapshot.datasets.events.length,
    actualMirrorEvents: mirror.size,
    expectedPublishedEvents: expectedPublicEvents,
    actualPublishedEvents: events.size,
    expectedApprovedEvents,
    islamicCalendarYears: calendar.size,
    islamicEvents: islamicEvents.size,
    centers: centers.size,
    stateHashMatches: state.exists && state.data().sourceHash === snapshot.snapshotHash,
  };
  result.passed =
    result.actualMirrorEvents === result.expectedMirrorEvents
    && result.actualPublishedEvents === result.expectedPublishedEvents
    && result.stateHashMatches;
  return result;
}

async function main() {
  const options = parseArguments(process.argv);
  const db = getAdminDb();

  if (options.command === 'backup') {
    console.log(JSON.stringify(await backupFirestore(db, options.backupPath), null, 2));
    return;
  }

  const snapshot = await buildProductionSnapshot(db);

  if (options.command === 'dry-run') {
    console.log(JSON.stringify({
      dryRun: true,
      source: {
        database: process.env.PASBAN_DB_NAME,
        today: snapshot.today,
        snapshotHash: snapshot.snapshotHash,
        counts: snapshot.counts,
      },
      comparison: await getDatasetComparison(db, snapshot),
    }, null, 2));
    return;
  }

  if (options.command === 'verify') {
    console.log(JSON.stringify(await verifyImport(db, snapshot), null, 2));
    return;
  }

  const backup = await backupFirestore(db, options.backupPath);
  const result = await runProductionSync({ db, snapshot, dryRun: false });
  const verification = await verifyImport(db, snapshot);
  console.log(JSON.stringify({ backup, result, verification }, null, 2));
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
