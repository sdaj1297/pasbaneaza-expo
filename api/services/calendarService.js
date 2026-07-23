const { pool } = require('../db');

const monthColumns = [
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

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

async function getIslamicDate(dateString) {
  const [rows] = await pool.query(
    `select
       PKID,
       LUNAR_YEAR,
       date_format(FIRST_DATE, '%Y-%m-%d') as FIRST_DATE,
       MUHARRAM,
       SAFAR,
       RABIA_AWAL,
       RABIA_THANI,
       JAMADIAL_AWAL,
       JAMADIAL_THANI,
       RAJAB,
       SHABAN,
       RAMAZAN,
       SHAWWAL,
       ZILQADAH,
       ZILHAJ
     from ISLAMIC_CALENDAR
     where FIRST_DATE <= :date
     order by FIRST_DATE desc
     limit 1`,
    { date: dateString },
  );

  const calendar = rows[0];
  if (!calendar) return null;

  let remainingDays = daysBetween(calendar.FIRST_DATE, dateString);

  for (let index = 0; index < monthColumns.length; index += 1) {
    const [column, monthName] = monthColumns[index];
    const monthLength = Number(calendar[column] || 0);
    if (remainingDays < monthLength) {
      const day = remainingDays + 1;
      return {
        day,
        month: index + 1,
        monthName,
        year: Number(calendar.LUNAR_YEAR),
        label: `${day} ${monthName}, ${calendar.LUNAR_YEAR}`,
      };
    }
    remainingDays -= monthLength;
  }

  return null;
}

async function getIslamicEvents(dateString) {
  const islamicDate = await getIslamicDate(dateString);
  if (!islamicDate) return { islamicDate: null, events: [] };

  const [rows] = await pool.query(
    `select PKID as id, IEVENT as title, EVENT_DESC as description, ICOLOR as color
     from ISLAMIC_EVENTS
     where IS_ACTIVE = 1 and IMONTH = :month and IDAY = :day
     order by PKID`,
    { day: islamicDate.day, month: islamicDate.month },
  );

  return {
    islamicDate,
    events: rows.map((row) => ({
      id: String(row.id),
      title: row.title || '',
      description: row.description || '',
      color: row.color || '',
    })),
  };
}

module.exports = {
  getIslamicDate,
  getIslamicEvents,
};
