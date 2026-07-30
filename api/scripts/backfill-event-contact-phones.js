require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const { pool } = require('../db');

const BATCH_SIZE = 400;

function getAdminDb() {
  if (!getApps().length) {
    const serviceAccountFile = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const credential = serviceAccountJson
      ? cert(JSON.parse(serviceAccountJson))
      : serviceAccountFile
        ? cert(JSON.parse(fs.readFileSync(path.resolve(serviceAccountFile), 'utf8')))
        : applicationDefault();
    initializeApp({
      credential,
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
  return getFirestore();
}

function clean(value) {
  return String(value || '').trim();
}

async function backfill({ apply = false } = {}) {
  const db = getAdminDb();
  const [rows] = await pool.query(
    `select
       PKID id,
       date_format(EVENT_DATE, '%Y-%m-%d') event_date,
       CONTACT_PHONE contact_phone,
       CONTACT_CELL contact_cell
     from EVENTS
     order by PKID`,
  );
  const updates = rows
    .map((row) => ({
      id: String(row.id),
      date: clean(row.event_date),
      contactPhone: clean(row.contact_cell) || clean(row.contact_phone),
    }))
    .filter((event) => event.contactPhone);

  if (apply) {
    let batch = db.batch();
    let writes = 0;
    for (const update of updates) {
      const payload = { contactPhone: update.contactPhone };
      batch.set(db.collection('events').doc(update.id), payload, { merge: true });
      batch.set(
        db.collection('eventDays').doc(update.date).collection('items').doc(update.id),
        payload,
        { merge: true },
      );
      writes += 2;
      if (writes >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        writes = 0;
      }
    }
    if (writes) await batch.commit();
  }

  await pool.end();
  return {
    apply,
    sqlEvents: rows.length,
    eventsWithContactPhone: updates.length,
    writes: apply ? updates.length * 2 : 0,
  };
}

if (require.main === module) {
  backfill({ apply: process.argv.includes('--apply') })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = { backfill };
