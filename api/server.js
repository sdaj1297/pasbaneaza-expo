const cors = require('cors');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { pool } = require('./db');
const { getIslamicDate, getIslamicEvents } = require('./services/calendarService');
const { getActiveAnnouncements, getFeaturedAnnouncement, getSayings } = require('./services/contentService');
const { getEventById, getEvents, getEventsForDate } = require('./services/eventService');
const { getMajlisStatusForDate, updateMajlisStatus } = require('./services/statusService');
const { createSubmission } = require('./services/submissionService');
const { getDisplayDate, getHoustonDate, HOUSTON_TIME_ZONE } = require('./utils/dates');

const app = express();
const port = Number(process.env.PORT || process.env.PASBAN_API_PORT || 3001);
const webDistPath = process.env.PASBAN_WEB_DIST || path.join(__dirname, '..', 'dist');
const webIndexPath = path.join(webDistPath, 'index.html');

app.use(cors());
app.use(express.json({ limit: '32kb' }));

function getDateParam(req, fallback = getHoustonDate()) {
  const value = String(req.query.date || fallback);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const error = new Error('Invalid date. Use YYYY-MM-DD.');
    error.status = 400;
    throw error;
  }
  return value;
}

app.get('/api/health', async (_req, res) => {
  const [rows] = await pool.query('select 1 as ok');
  res.json({
    ok: rows[0].ok === 1,
    database: process.env.PASBAN_DB_NAME || 'pasbaaza_pasbaneaza_org_db',
    timezone: HOUSTON_TIME_ZONE,
    today: getHoustonDate(),
  });
});

app.get('/api/meta/today', async (_req, res, next) => {
  try {
    const today = getHoustonDate();
    const islamicDate = await getIslamicDate(today);
    const islamicEvents = await getIslamicEvents(today);

    res.json({
      date: today,
      label: getDisplayDate(today),
      timezone: HOUSTON_TIME_ZONE,
      islamicDate,
      islamicEvents: islamicEvents.events,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/events', async (req, res, next) => {
  try {
    const events = await getEvents({
      filter: String(req.query.filter || 'all'),
      from: req.query.from ? getDateParam({ query: { date: req.query.from } }) : undefined,
      to: req.query.to ? getDateParam({ query: { date: req.query.to } }) : undefined,
      limit: req.query.limit,
    });
    res.json({ events });
  } catch (error) {
    next(error);
  }
});

app.get('/api/events/today', async (req, res, next) => {
  try {
    const date = getDateParam(req);
    const events = await getEventsForDate(date, { filter: String(req.query.filter || 'all') });
    res.json({ date, events });
  } catch (error) {
    next(error);
  }
});

app.get('/api/events/:id', async (req, res, next) => {
  try {
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      const error = new Error('Invalid event id.');
      error.status = 400;
      throw error;
    }

    const event = await getEventById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }

    res.json({ event });
  } catch (error) {
    next(error);
  }
});

app.get('/api/majlis-status/today', async (req, res, next) => {
  try {
    const date = getDateParam(req);
    const board = await getMajlisStatusForDate(date);
    res.json(board);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/majlis-status/:eventId', async (req, res, next) => {
  try {
    const eventDate = req.body.eventDate || req.body.date || getHoustonDate();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      const error = new Error('eventDate must use YYYY-MM-DD.');
      error.status = 400;
      throw error;
    }

    const status = await updateMajlisStatus({
      eventId: req.params.eventId,
      eventDate,
      status: req.body.status,
      stage: req.body.stage,
      source: req.body.source || 'community',
      updatedBy: req.body.updatedBy,
    });
    const board = await getMajlisStatusForDate(eventDate);

    res.json({ status, board });
  } catch (error) {
    next(error);
  }
});

app.get('/api/prayer-times/today', (_req, res) => {
  res.json({
    location: 'Houston',
    date: getHoustonDate(),
    times: [
      { label: 'Fajr', time: '5:00 AM' },
      { label: 'Sunrise', time: '6:24 AM' },
      { label: 'Zohr', time: '1:25 PM' },
      { label: 'Sunset', time: '8:26 PM' },
      { label: 'Magrib', time: '8:43 PM' },
    ],
  });
});

app.get('/api/announcements/active', async (_req, res, next) => {
  try {
    const announcements = await getActiveAnnouncements();
    res.json({ announcements });
  } catch (error) {
    next(error);
  }
});

async function handleFormSubmission(req, res, next) {
  try {
    const submission = await createSubmission({
      ...req.body,
      type: req.params.type || req.body.type,
    });
    res.status(201).json({ submission });
  } catch (error) {
    next(error);
  }
}

app.post('/api/forms', handleFormSubmission);
app.post('/api/forms/:type', handleFormSubmission);

app.get('/api/home', async (_req, res, next) => {
  try {
    const today = getHoustonDate();
    const [meta, announcements, featuredAnnouncement, sayings, upcomingEvents, prayerTimes] = await Promise.all([
      getIslamicEvents(today),
      getActiveAnnouncements(),
      getFeaturedAnnouncement(),
      getSayings(1),
      getEvents({ filter: 'anjuman', from: today, limit: 6 }),
      Promise.resolve([
        { label: 'Fajr', time: '5:00 AM' },
        { label: 'Sunrise', time: '6:24 AM' },
        { label: 'Zohr', time: '1:25 PM' },
        { label: 'Sunset', time: '8:26 PM' },
        { label: 'Magrib', time: '8:43 PM' },
      ]),
    ]);

    res.json({
      date: today,
      label: getDisplayDate(today),
      timezone: HOUSTON_TIME_ZONE,
      islamicDate: meta.islamicDate,
      islamicEvents: meta.events,
      announcements,
      featuredAnnouncement,
      sayings,
      prayerTimes,
      upcomingEvents,
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

if (fs.existsSync(webIndexPath)) {
  app.use(express.static(webDistPath));
  app.use((req, res, next) => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    res.sendFile(webIndexPath);
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({
    error: error.status ? error.message : 'Internal server error',
    detail: process.env.NODE_ENV === 'production' ? undefined : error.message,
  });
});

function start() {
  app.listen(port, () => {
    console.log(`Pasban app listening on http://localhost:${port}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
