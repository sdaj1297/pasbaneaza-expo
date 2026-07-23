const { pool } = require('../db');
const { cleanText } = require('../utils/text');
const { getEventsForDate } = require('./eventService');

const allowedStatuses = new Set(['Pending', 'En Route', 'Started', 'Completed', 'Delayed', 'Skipped']);
const allowedSources = new Set(['community', 'admin', 'verification']);

function validateMajlisStatusInput(input) {
  const eventId = Number(input.eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    const error = new Error('eventId must be a positive integer.');
    error.status = 400;
    throw error;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate || '')) {
    const error = new Error('eventDate must use YYYY-MM-DD.');
    error.status = 400;
    throw error;
  }

  if (!allowedStatuses.has(input.status)) {
    const error = new Error('Invalid majlis status.');
    error.status = 400;
    throw error;
  }

  const source = input.source || 'community';
  if (!allowedSources.has(source)) {
    const error = new Error('Invalid majlis status source.');
    error.status = 400;
    throw error;
  }

  return {
    eventId,
    eventDate: input.eventDate,
    status: input.status,
    stage: cleanText(input.stage).slice(0, 100) || null,
    source,
    updatedBy: cleanText(input.updatedBy).slice(0, 100) || null,
  };
}

async function getStatusRowsByDate(date, db = pool) {
  const [rows] = await db.query(
    `select
       event_id as eventId,
       date_format(event_date, '%Y-%m-%d') as eventDate,
       status,
       stage,
       source,
       updated_by as updatedBy,
       date_format(updated_at, '%Y-%m-%d %H:%i:%s') as updatedAt
     from app_majlis_status
     where event_date = :date`,
    { date },
  );

  return rows.map((row) => ({
    eventId: String(row.eventId),
    eventDate: row.eventDate,
    status: row.status,
    stage: cleanText(row.stage),
    source: row.source,
    updatedBy: cleanText(row.updatedBy),
    updatedAt: row.updatedAt,
  }));
}

function summarizeMajlisStatus(events) {
  const completedCount = events.filter((event) => event.status === 'Completed').length;
  const current = events.find((event) => event.status === 'Started' || event.status === 'En Route') || events[0] || null;

  return {
    totalCount: events.length,
    completedCount,
    currentEventId: current?.id || null,
    currentStatus: current?.status || 'Pending',
    currentStage: current?.stage || '',
  };
}

async function getMajlisStatusForDate(date, db = pool) {
  const [events, statusRows] = await Promise.all([
    getEventsForDate(date, { filter: 'anjuman' }),
    getStatusRowsByDate(date, db),
  ]);
  const statusesByEventId = new Map(statusRows.map((status) => [status.eventId, status]));
  const eventsWithStatus = events.map((event) => {
    const status = statusesByEventId.get(event.id);
    return {
      ...event,
      status: status?.status || 'Pending',
      stage: status?.stage || '',
      statusSource: status?.source || '',
      updatedBy: status?.updatedBy || '',
      updatedAt: status?.updatedAt || '',
    };
  });

  return {
    date,
    events: eventsWithStatus,
    summary: summarizeMajlisStatus(eventsWithStatus),
  };
}

async function updateMajlisStatus(input, db = pool) {
  const status = validateMajlisStatusInput(input);

  await db.query(
    `insert into app_majlis_status
       (event_id, event_date, status, stage, source, updated_by)
     values
       (:eventId, :eventDate, :status, :stage, :source, :updatedBy)
     on duplicate key update
       status = values(status),
       stage = values(stage),
       source = values(source),
       updated_by = values(updated_by),
       updated_at = current_timestamp`,
    status,
  );

  return status;
}

module.exports = {
  allowedStatuses,
  getMajlisStatusForDate,
  getStatusRowsByDate,
  updateMajlisStatus,
  validateMajlisStatusInput,
};
