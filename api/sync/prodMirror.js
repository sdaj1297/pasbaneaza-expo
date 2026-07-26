const crypto = require('crypto');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const { getFirebaseAdminDb } = require('../firebaseAdmin');
const { signRequest } = require('./signature');

const MAX_BATCH_OPERATIONS = 400;
const LOCK_TTL_MS = 2 * 60 * 1000;

class SyncAlreadyRunningError extends Error {}

class BatchWriter {
  constructor(db) {
    this.db = db;
    this.batch = db.batch();
    this.pending = 0;
    this.total = 0;
  }

  async set(ref, value, options = { merge: true }) {
    this.batch.set(ref, value, options);
    await this.count();
  }

  async delete(ref) {
    this.batch.delete(ref);
    await this.count();
  }

  async count() {
    this.pending += 1;
    this.total += 1;
    if (this.pending >= MAX_BATCH_OPERATIONS) await this.flush();
  }

  async flush() {
    if (!this.pending) return;
    await this.batch.commit();
    this.batch = this.db.batch();
    this.pending = 0;
  }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;

  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = stableValue(value[key]);
      return result;
    }, {});
}

function hashValue(value) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stableValue(value)))
    .digest('hex');
}

function indexRecords(records = []) {
  return Object.fromEntries(records.map((record) => [String(record.id), hashValue(record)]));
}

function computeDiff(previous = {}, next = {}) {
  const changed = Object.keys(next).filter((id) => previous[id] !== next[id]);
  const deleted = Object.keys(previous).filter((id) => !Object.prototype.hasOwnProperty.call(next, id));
  return { changed, deleted };
}

async function fetchProductionSnapshot() {
  const url = process.env.PROD_SYNC_SNAPSHOT_URL;
  const secret = process.env.PASBAN_SYNC_SHARED_SECRET;
  if (!url || !secret) throw new Error('Production snapshot URL and shared secret are required.');

  const parsed = new URL(url);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Pasban-Timestamp': timestamp,
      'X-Pasban-Signature': signRequest(secret, timestamp, 'GET', parsed.pathname, ''),
    },
  });

  if (!response.ok) throw new Error(`Production snapshot returned HTTP ${response.status}.`);
  const snapshot = await response.json();
  if (snapshot.schemaVersion !== 1 || !snapshot.datasets) throw new Error('Unsupported production snapshot.');
  if (hashValue(snapshot.datasets) !== snapshot.snapshotHash) throw new Error('Production snapshot hash mismatch.');
  return snapshot;
}

async function acquireLock(db, token) {
  const stateRef = db.collection('prodSyncState').doc('current');
  await db.runTransaction(async (transaction) => {
    const stateSnapshot = await transaction.get(stateRef);
    const state = stateSnapshot.exists ? stateSnapshot.data() : {};
    const lockExpiresAt = state.lockExpiresAt?.toMillis?.() || 0;
    if (lockExpiresAt > Date.now()) throw new SyncAlreadyRunningError('A production synchronization is already running.');

    transaction.set(stateRef, {
      lockToken: token,
      lockExpiresAt: Timestamp.fromMillis(Date.now() + LOCK_TTL_MS),
      lastAttemptAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  return stateRef;
}

async function syncEvents(db, records, writer) {
  const manifestRef = db.collection('prodSyncManifests').doc('events');
  const manifestSnapshot = await manifestRef.get();
  const previousHashes = manifestSnapshot.exists ? manifestSnapshot.data().records || {} : {};
  const nextHashes = indexRecords(records);
  const recordsById = new Map(records.map((record) => [String(record.id), record]));
  const diff = computeDiff(previousHashes, nextHashes);
  const affectedDates = new Set();

  for (const id of diff.changed) {
    const record = recordsById.get(id);
    const mirrorRef = db.collection('prodMirrorEvents').doc(id);
    const effectiveRef = db.collection('events').doc(id);
    const overrideRef = db.collection('betaEventOverrides').doc(id);
    const [oldMirror, override] = await Promise.all([mirrorRef.get(), overrideRef.get()]);
    const oldData = oldMirror.exists ? oldMirror.data() : null;

    if (oldData?.date) affectedDates.add(oldData.date);
    if (record.date) affectedDates.add(record.date);

    if (override.exists && (!previousHashes[id] || previousHashes[id] !== nextHashes[id])) {
      await writer.set(db.collection('prodSyncConflicts').doc(`event-${id}-${Date.now()}`), {
        type: 'event',
        recordId: id,
        reason: previousHashes[id] ? 'production_changed' : 'production_baseline_imported',
        previousSourceHash: previousHashes[id],
        nextSourceHash: nextHashes[id],
        override: override.data(),
        createdAt: FieldValue.serverTimestamp(),
      });
      await writer.delete(overrideRef);
    }

    const payload = {
      ...record,
      source: 'prod-mysql',
      sourceHash: nextHashes[id],
      syncedAt: FieldValue.serverTimestamp(),
    };
    await writer.set(mirrorRef, payload);

    if (record.isPublished) {
      await writer.set(effectiveRef, payload);
      await writer.set(db.collection('eventDays').doc(record.date), {
        date: record.date,
        source: 'prod-mysql',
        updatedAt: FieldValue.serverTimestamp(),
      });
      await writer.set(db.collection('eventDays').doc(record.date).collection('items').doc(id), payload);
    } else {
      await writer.delete(effectiveRef);
      if (oldData?.date) await writer.delete(db.collection('eventDays').doc(oldData.date).collection('items').doc(id));
    }

    if (oldData?.date && oldData.date !== record.date) {
      await writer.delete(db.collection('eventDays').doc(oldData.date).collection('items').doc(id));
    }
  }

  for (const id of diff.deleted) {
    const mirrorRef = db.collection('prodMirrorEvents').doc(id);
    const effectiveRef = db.collection('events').doc(id);
    const overrideRef = db.collection('betaEventOverrides').doc(id);
    const [oldMirror, override] = await Promise.all([mirrorRef.get(), overrideRef.get()]);
    const oldData = oldMirror.exists ? oldMirror.data() : null;
    if (oldData?.date) affectedDates.add(oldData.date);

    if (override.exists) {
      await writer.set(db.collection('prodSyncConflicts').doc(`event-${id}-${Date.now()}`), {
        type: 'event',
        recordId: id,
        reason: 'production_deleted',
        previousSourceHash: previousHashes[id],
        override: override.data(),
        createdAt: FieldValue.serverTimestamp(),
      });
      await writer.delete(overrideRef);
    }

    await writer.delete(mirrorRef);
    await writer.delete(effectiveRef);
    if (oldData?.date) await writer.delete(db.collection('eventDays').doc(oldData.date).collection('items').doc(id));
  }

  const publishedByDate = records.reduce((counts, record) => {
    if (record.isPublished) counts[record.date] = (counts[record.date] || 0) + 1;
    return counts;
  }, {});
  for (const date of affectedDates) {
    await writer.set(db.collection('eventDays').doc(date), {
      date,
      eventCount: publishedByDate[date] || 0,
      updatedAt: FieldValue.serverTimestamp(),
      source: 'prod-mysql',
    });
  }

  await writer.set(manifestRef, {
    datasetHash: hashValue(records),
    records: nextHashes,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { ...diff, total: records.length };
}

async function syncCollection(db, writer, options) {
  const {
    dataset,
    records,
    collectionName,
    mirrorCollectionName,
    overrideCollectionName,
    transform = (record) => record,
  } = options;
  const manifestRef = db.collection('prodSyncManifests').doc(dataset);
  const manifestSnapshot = await manifestRef.get();
  const previousHashes = manifestSnapshot.exists ? manifestSnapshot.data().records || {} : {};
  const nextHashes = indexRecords(records);
  const recordsById = new Map(records.map((record) => [String(record.id), record]));
  const diff = computeDiff(previousHashes, nextHashes);

  for (const id of diff.changed) {
    const record = recordsById.get(id);
    const payload = {
      ...transform(record),
      source: 'prod-mysql',
      sourceHash: nextHashes[id],
      syncedAt: FieldValue.serverTimestamp(),
    };

    if (overrideCollectionName && previousHashes[id] && previousHashes[id] !== nextHashes[id]) {
      const overrideRef = db.collection(overrideCollectionName).doc(id);
      const override = await overrideRef.get();
      if (override.exists) {
        await writer.set(db.collection('prodSyncConflicts').doc(`${dataset}-${id}-${Date.now()}`), {
          type: dataset,
          recordId: id,
          reason: 'production_changed',
          override: override.data(),
          createdAt: FieldValue.serverTimestamp(),
        });
        await writer.delete(overrideRef);
      }
    }

    if (mirrorCollectionName) await writer.set(db.collection(mirrorCollectionName).doc(id), payload);
    await writer.set(db.collection(collectionName).doc(id), payload);
  }

  for (const id of diff.deleted) {
    if (mirrorCollectionName) await writer.delete(db.collection(mirrorCollectionName).doc(id));
    await writer.delete(db.collection(collectionName).doc(id));
    if (overrideCollectionName) {
      const overrideRef = db.collection(overrideCollectionName).doc(id);
      const override = await overrideRef.get();
      if (override.exists) {
        await writer.set(db.collection('prodSyncConflicts').doc(`${dataset}-${id}-${Date.now()}`), {
          type: dataset,
          recordId: id,
          reason: 'production_deleted',
          override: override.data(),
          createdAt: FieldValue.serverTimestamp(),
        });
        await writer.delete(overrideRef);
      }
    }
  }

  await writer.set(manifestRef, {
    datasetHash: hashValue(records),
    records: nextHashes,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ...diff, total: records.length };
}

function bannerFromAnnouncement(record) {
  const imageMatch = String(record.html || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  return {
    id: `announcement-${record.id}`,
    title: record.title,
    eyebrow: record.fullPage ? 'Featured Event' : 'Announcement',
    description: record.body,
    html: record.html,
    flyerUrl: imageMatch?.[1] || '',
    isActive: true,
    isFeatured: Boolean(record.fullPage),
    startsAt: String(record.postFrom || '').slice(0, 10),
    endsAt: String(record.postUntil || '').slice(0, 10),
    displayOrder: record.displayOrder || 0,
  };
}

function bannerFromSpecialEvent(record) {
  return {
    id: `special-${record.id}`,
    title: record.title,
    eyebrow: 'Featured Event',
    description: record.title,
    dateLabel: [record.date, record.time].filter(Boolean).join(' at '),
    flyerUrl: record.flyerUrl || '',
    isActive: true,
    isFeatured: true,
    startsAt: record.date,
    endsAt: record.date,
    displayOrder: 0,
  };
}

async function runProductionSync(options = {}) {
  const snapshot = options.snapshot || await fetchProductionSnapshot();
  const dryRun = options.dryRun ?? process.env.PROD_SYNC_DRY_RUN === 'true';
  const db = options.db || getFirebaseAdminDb();
  const stateRef = db.collection('prodSyncState').doc('current');
  const currentState = await stateRef.get();

  if (currentState.exists && currentState.data().sourceHash === snapshot.snapshotHash) {
    if (!dryRun) {
      await stateRef.set({
        lastCheckedAt: FieldValue.serverTimestamp(),
        sourceGeneratedAt: snapshot.generatedAt,
        status: 'current',
      }, { merge: true });
    }
    return { ok: true, noOp: true, dryRun, snapshotHash: snapshot.snapshotHash };
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      noOp: false,
      snapshotHash: snapshot.snapshotHash,
      counts: snapshot.counts,
    };
  }

  const lockToken = crypto.randomUUID();
  await acquireLock(db, lockToken);
  const writer = new BatchWriter(db);

  try {
    const datasets = snapshot.datasets;
    const results = {};
    results.events = await syncEvents(db, datasets.events || [], writer);
    results.centers = await syncCollection(db, writer, {
      dataset: 'centers',
      records: datasets.centers || [],
      collectionName: 'centers',
    });
    results.specialEvents = await syncCollection(db, writer, {
      dataset: 'specialEvents',
      records: datasets.specialEvents || [],
      collectionName: 'specialEvents',
    });
    results.islamicCalendar = await syncCollection(db, writer, {
      dataset: 'islamicCalendar',
      records: datasets.islamicCalendar || [],
      collectionName: 'islamicCalendar',
      mirrorCollectionName: 'prodMirrorIslamicCalendar',
      overrideCollectionName: 'betaIslamicCalendarOverrides',
    });
    results.islamicEvents = await syncCollection(db, writer, {
      dataset: 'islamicEvents',
      records: datasets.islamicEvents || [],
      collectionName: 'islamicEvents',
    });

    const banners = [
      ...(datasets.announcements || []).map(bannerFromAnnouncement),
      ...(datasets.specialEvents || []).filter((event) => event.flyerUrl).map(bannerFromSpecialEvent),
    ];
    results.banners = await syncCollection(db, writer, {
      dataset: 'banners',
      records: banners,
      collectionName: 'banners',
    });

    await writer.set(db.collection('settings').doc('home'), {
      announcements: datasets.announcements || [],
      sayings: datasets.sayings || [],
      prayerTimes: datasets.prayerTimes?.times || [],
      source: 'prod-mysql',
      sourceHash: hashValue({
        announcements: datasets.announcements || [],
        sayings: datasets.sayings || [],
        prayerTimes: datasets.prayerTimes || {},
      }),
      syncedAt: FieldValue.serverTimestamp(),
    });
    await writer.set(db.collection('settings').doc('prayerTimes'), {
      ...(datasets.prayerTimes || {}),
      source: 'prod-mysql',
      syncedAt: FieldValue.serverTimestamp(),
    });
    await writer.flush();

    await stateRef.set({
      lockToken: FieldValue.delete(),
      lockExpiresAt: FieldValue.delete(),
      status: 'current',
      sourceHash: snapshot.snapshotHash,
      sourceGeneratedAt: snapshot.generatedAt,
      sourceToday: snapshot.today,
      counts: snapshot.counts,
      results,
      writes: writer.total,
      lastSuccessAt: FieldValue.serverTimestamp(),
      lastCheckedAt: FieldValue.serverTimestamp(),
      lastError: FieldValue.delete(),
    }, { merge: true });

    return { ok: true, noOp: false, dryRun: false, writes: writer.total, results };
  } catch (error) {
    await stateRef.set({
      lockToken: FieldValue.delete(),
      lockExpiresAt: FieldValue.delete(),
      status: 'error',
      lastError: error.message,
      lastFailureAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    throw error;
  }
}

module.exports = {
  SyncAlreadyRunningError,
  computeDiff,
  hashValue,
  indexRecords,
  runProductionSync,
};
