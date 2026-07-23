const { pool } = require('../db');
const { getHoustonDateTime } = require('../utils/dates');
const { cleanText, extractFirstImageUrl, stripHtml } = require('../utils/text');

function normalizeAnnouncement(row) {
  const html = row.html || '';
  return {
    id: String(row.id),
    title: cleanText(row.title),
    body: stripHtml(html),
    html,
    imageUrl: extractFirstImageUrl(html),
    fullPage: Number(row.fullPage) === 1,
    displayOrder: Number(row.displayOrder || 0),
    postFrom: row.postFrom,
    postUntil: row.postUntil,
  };
}

async function getActiveAnnouncements(limit = 5) {
  const now = getHoustonDateTime();
  const [rows] = await pool.query(
    `select
       PKID as id,
       DISPLAY_TITLE as title,
       ANNOUNCEMENT as html,
       date_format(POST_FROM, '%Y-%m-%d %H:%i:%s') as postFrom,
       date_format(POST_UNTIL, '%Y-%m-%d %H:%i:%s') as postUntil,
       DISPLAY_ORDER as displayOrder,
       FULL_PAGE as fullPage
     from ANNOUNCEMENTS
     where POST_FROM <= :now and POST_UNTIL >= :now
     order by DISPLAY_ORDER, PKID
     limit :limit`,
    { limit, now },
  );

  return rows.map(normalizeAnnouncement);
}

async function getFeaturedAnnouncement() {
  const announcements = await getActiveAnnouncements(10);
  return announcements.find((announcement) => announcement.fullPage) || announcements[0] || null;
}

async function getSayings(limit = 1) {
  const [rows] = await pool.query(
    `select PKID as id, WHO as who, SAYING as saying
     from SAYINGS
     where IS_ACTIVE = 1
     order by PKID
     limit :limit`,
    { limit },
  );

  return rows.map((row) => ({
    id: String(row.id),
    who: cleanText(row.who),
    saying: cleanText(row.saying),
  }));
}

module.exports = {
  getActiveAnnouncements,
  getFeaturedAnnouncement,
  getSayings,
};
