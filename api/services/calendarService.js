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

const { pool } = require('../db');

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

function normalizeCalendarYear(row) {
  return {
    id: String(row.PKID),
    year: Number(row.LUNAR_YEAR),
    firstDate: String(row.FIRST_DATE).slice(0, 10),
    months: monthColumns.map(([column, name], index) => ({
      index: index + 1,
      key: column,
      name,
      length: Number(row[column] || 0),
    })),
  };
}

function calculateIslamicDate(dateString, calendarYears) {
  const calendar = [...calendarYears]
    .filter((year) => year.firstDate <= dateString)
    .sort((a, b) => (a.firstDate < b.firstDate ? 1 : -1))[0];

  if (!calendar) return null;

  let remainingDays = daysBetween(calendar.firstDate, dateString);

  for (const month of calendar.months) {
    if (remainingDays < month.length) {
      const day = remainingDays + 1;
      return {
        day,
        month: month.index,
        monthName: month.name,
        year: calendar.year,
        label: `${day} ${month.name}, ${calendar.year}`,
      };
    }
    remainingDays -= month.length;
  }

  return null;
}

function monthColumnForIndex(monthIndex) {
  const month = monthColumns[monthIndex - 1];
  if (!month) return null;
  return { key: month[0], name: month[1], index: monthIndex };
}

async function getIslamicCalendarYears(db = pool) {
  const [rows] = await db.query(
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
     order by FIRST_DATE`,
  );

  return rows.map(normalizeCalendarYear);
}

async function getIslamicCalendarYear(lunarYear, db = pool) {
  const [rows] = await db.query(
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
     where LUNAR_YEAR = :lunarYear
     limit 1`,
    { lunarYear },
  );

  return rows[0] ? normalizeCalendarYear(rows[0]) : null;
}

async function getIslamicDate(dateString, db = pool) {
  const [rows] = await db.query(
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

  return calculateIslamicDate(dateString, [normalizeCalendarYear(calendar)]);
}

async function getAllIslamicEvents(db = pool) {
  const [rows] = await db.query(
    `select PKID as id, IMONTH as month, IDAY as day, IEVENT as title, EVENT_DESC as description, ICOLOR as color
     from ISLAMIC_EVENTS
     where IS_ACTIVE = 1
     order by IMONTH, IDAY, PKID`,
  );

  return rows.map((row) => ({
    id: String(row.id),
    month: Number(row.month),
    day: Number(row.day),
    title: row.title || '',
    description: row.description || '',
    color: row.color || '',
  }));
}

async function getIslamicEvents(dateString, db = pool) {
  const islamicDate = await getIslamicDate(dateString, db);
  if (!islamicDate) return { islamicDate: null, events: [] };

  const [rows] = await db.query(
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

async function updateIslamicMonthLength(input, db = pool) {
  const lunarYear = Number(input.year);
  const monthIndex = Number(input.month);
  const length = Number(input.length);
  const month = monthColumnForIndex(monthIndex);

  if (!Number.isInteger(lunarYear) || lunarYear < 1200 || lunarYear > 1700) {
    const error = new Error('Invalid lunar year.');
    error.status = 400;
    throw error;
  }

  if (!month) {
    const error = new Error('Invalid Islamic month.');
    error.status = 400;
    throw error;
  }

  if (![29, 30].includes(length)) {
    const error = new Error('Islamic month length must be 29 or 30 days.');
    error.status = 400;
    throw error;
  }

  const [result] = await db.query(`update ISLAMIC_CALENDAR set ${month.key} = :length where LUNAR_YEAR = :lunarYear`, {
    length,
    lunarYear,
  });

  if (result.affectedRows === 0) {
    const error = new Error('Islamic calendar year not found.');
    error.status = 404;
    throw error;
  }

  const year = await getIslamicCalendarYear(lunarYear, db);
  return {
    year,
    month: year.months.find((item) => item.index === monthIndex),
  };
}

module.exports = {
  calculateIslamicDate,
  getAllIslamicEvents,
  getIslamicDate,
  getIslamicCalendarYear,
  getIslamicCalendarYears,
  getIslamicEvents,
  monthColumns,
  monthColumnForIndex,
  updateIslamicMonthLength,
};
