const assert = require('assert/strict');
require('dotenv').config();

const { pool } = require('../db');
const { runMigrations } = require('./migrate');
const { getIslamicDate } = require('../services/calendarService');
const { getEventById, getEvents, getEventsForDate } = require('../services/eventService');
const { createSubmission } = require('../services/submissionService');
const { getMajlisStatusForDate, getStatusRowsByDate, updateMajlisStatus } = require('../services/statusService');
const { getHoustonDate } = require('../utils/dates');

async function verify() {
  await runMigrations();

  assert.equal(getHoustonDate(new Date('2026-06-28T04:59:00.000Z')), '2026-06-27');
  assert.equal(getHoustonDate(new Date('2026-06-28T05:00:00.000Z')), '2026-06-28');

  const islamicDate = await getIslamicDate('2026-06-28');
  assert.equal(islamicDate.label, '13 Muharram, 1448');

  const anjumanToday = await getEventsForDate('2026-06-28', { filter: 'anjuman' });
  assert.equal(anjumanToday.length, 3);
  assert.ok(anjumanToday.every((event) => event.isPublished));
  assert.ok(anjumanToday.every((event) => event.isAnjumanSchedule));
  assert.ok(anjumanToday.every((event) => event.waitingApproval === false));
  assert.deepEqual(anjumanToday.map((event) => event.contactName), ['Zafar Syed', 'Irfan A Sabir', 'Kayam Ali / Mohamed Fazl']);

  const upcomingAnjuman = await getEvents({ filter: 'anjuman', from: '2026-06-28', limit: 3 });
  assert.equal(upcomingAnjuman.length, 3);
  assert.equal(upcomingAnjuman[0].contactName, 'Zafar Syed');

  const eventDetail = await getEventById(4439);
  assert.equal(eventDetail.id, '4439');
  assert.ok(Array.isArray(eventDetail.program));

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await updateMajlisStatus(
      {
        eventId: 4439,
        eventDate: '2026-06-28',
        status: 'Started',
        stage: 'Verification',
        source: 'verification',
        updatedBy: 'verify-api',
      },
      connection,
    );

    const statusRows = await getStatusRowsByDate('2026-06-28', connection);
    const statusRow = statusRows.find((row) => row.eventId === '4439');
    assert.equal(statusRow.status, 'Started');
    assert.equal(statusRow.stage, 'Verification');

    const board = await getMajlisStatusForDate('2026-06-28', connection);
    assert.equal(board.events.find((event) => event.id === '4439').status, 'Started');
    assert.equal(board.summary.currentEventId, '4439');

    const submission = await createSubmission(
      {
        type: 'volunteer',
        name: 'Verification User',
        email: 'verify@example.com',
        payload: { interests: ['status'] },
        source: 'verify-api',
      },
      connection,
    );
    assert.equal(submission.type, 'volunteer');
    assert.equal(submission.status, 'new');

    await connection.rollback();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return {
    ok: true,
    checked: [
      'houston-date-boundary',
      'islamic-date',
      'anjuman-event-filtering',
      'event-detail-program',
      'majlis-status-sql-update',
      'form-submission-sql-insert',
    ],
  };
}

if (require.main === module) {
  verify()
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

module.exports = { verify };
