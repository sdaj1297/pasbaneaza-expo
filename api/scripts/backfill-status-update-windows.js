require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const { getHoustonDate } = require('../utils/dates');
const { getStatusUpdatesOpenAt } = require('../utils/statusUpdateWindow');

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

async function backfill({ apply = false } = {}) {
  const db = getAdminDb();
  const today = getHoustonDate();
  const snapshot = await db.collection('events')
    .where('date', '>=', today)
    .orderBy('date')
    .get();
  const updates = [];
  const skipped = [];

  for (const eventDoc of snapshot.docs) {
    const data = eventDoc.data();
    const opensAt = getStatusUpdatesOpenAt(data.date, data.time);
    if (!opensAt) {
      skipped.push({ id: eventDoc.id, date: data.date || '', time: data.time || '' });
      continue;
    }
    updates.push({
      id: eventDoc.id,
      date: data.date,
      statusUpdatesOpenAt: Timestamp.fromDate(opensAt),
    });
  }

  if (apply) {
    let batch = db.batch();
    let writes = 0;
    for (const update of updates) {
      const payload = { statusUpdatesOpenAt: update.statusUpdatesOpenAt };
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

  return {
    apply,
    fromDate: today,
    eligibleEvents: updates.length,
    skipped,
  };
}

if (require.main === module) {
  backfill({ apply: process.argv.includes('--apply') })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = { backfill };
