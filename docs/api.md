# Pasban API Contract

Local base URL: `http://localhost:3001/api`

Run `npm run db:migrate` before using write endpoints. Run `npm run verify:api` after importing the SQL dump.

## Shared Rules

- Public event lists require `EVENTS.PUBLISH = 1`, `EVENTS.PLACE_HOLDER = 0`, and `EVENTS.WAITING_APPROVAL = 0`.
- Anjuman schedule views also require `EVENTS.ADDTOSCHD = 1`.
- All "today" endpoints use Houston time: `America/Chicago`.
- Dates use `YYYY-MM-DD`.
- IDs are returned as strings to avoid frontend number/string drift.

## Health

`GET /health`

Returns DB connectivity, configured DB name, Houston timezone, and Houston date.

## Home

`GET /home`

Returns the payload needed by the home screen:

- `date`, `label`, `timezone`
- `islamicDate`
- `islamicEvents`
- `announcements`
- `featuredAnnouncement`
- `sayings`
- `prayerTimes`
- `upcomingEvents`

## Calendar And Events

`GET /calendar/month`

Query params:

- `date=YYYY-MM-DD`
- `filter=all|anjuman|brothers|sisters|family`

Returns a complete Sunday-through-Saturday month grid. Each day includes Gregorian metadata, calculated Islamic date, Islamic observances, and approved public events for that date.

```json
{
  "month": {
    "label": "June 2026",
    "startDate": "2026-06-01",
    "endDate": "2026-06-30",
    "gridStart": "2026-05-31",
    "gridEnd": "2026-07-04"
  },
  "days": [
    {
      "date": "2026-06-28",
      "islamicDate": { "label": "13 Muharram, 1448" },
      "islamicEvents": [],
      "events": []
    }
  ]
}
```

`GET /calendar.ics`

Query params:

- `date=YYYY-MM-DD`
- `from=YYYY-MM-DD`
- `to=YYYY-MM-DD`
- `filter=all|anjuman|brothers|sisters|family`

Returns a `text/calendar` `.ics` file for import/subscription by calendar clients. The Expo app also generates this client-side for the Firestore/Netlify beta and uses native calendar APIs on iOS/Android.

`GET /events`

Query params:

- `filter=all|anjuman|brothers|sisters|family`
- `from=YYYY-MM-DD`
- `to=YYYY-MM-DD`
- `limit=1..250`

`GET /events/today`

Query params:

- `date=YYYY-MM-DD`
- `filter=all|anjuman|brothers|sisters|family`

`GET /events/:id`

Returns one approved public event plus its `EVENTS_DETAIL` program rows.

Event shape:

```json
{
  "id": "4439",
  "title": "Salana Majalis",
  "contactName": "Zafar Syed",
  "date": "2026-06-28",
  "time": "1:30 PM",
  "islamicDate": "13 Muharram, 1448",
  "type": "M",
  "locationName": "Lake Woodbridge",
  "address": "14903 Lake Woodbridge Court, Sugar Land, TX, 77498",
  "flyer": "",
  "socialUrl": "",
  "isAnjumanSchedule": true,
  "isPublished": true,
  "waitingApproval": false
}
```

## Majlis Status

`GET /majlis-status/today`

Query params:

- `date=YYYY-MM-DD`

Returns today's approved Anjuman schedule with SQL-backed status overlay.

```json
{
  "date": "2026-06-28",
  "events": [],
  "summary": {
    "totalCount": 3,
    "completedCount": 0,
    "currentEventId": "4439",
    "currentStatus": "Started",
    "currentStage": "Hadis e Kisa"
  }
}
```

`PATCH /majlis-status/:eventId`

Body:

```json
{
  "eventDate": "2026-06-28",
  "status": "Started",
  "stage": "Hadis e Kisa",
  "source": "community",
  "updatedBy": ""
}
```

Allowed statuses: `Pending`, `En Route`, `Started`, `Completed`, `Delayed`, `Skipped`.

This endpoint is intentionally open for now. Auth can later be added at the route/middleware layer without changing the data contract.

## Announcements And Special Banners

`GET /announcements/active`

Returns date-active legacy `ANNOUNCEMENTS` rows, including extracted `imageUrl` for flyer-style banners.

## Islamic Calendar

`GET /meta/today`

Returns Houston Gregorian date, calculated Islamic date from `ISLAMIC_CALENDAR`, and active rows from `ISLAMIC_EVENTS`.

`GET /islamic-calendar/years`

Returns legacy `ISLAMIC_CALENDAR` rows normalized as years with twelve month length records.

`PATCH /islamic-calendar/:year/months/:month`

Body:

```json
{
  "length": 29
}
```

Updates the month length for a lunar year. `length` must be `29` or `30`. This is intentionally open during beta so the public admin page can preserve the legacy month-adjustment utility; later auth can be added without changing the route contract.

## Prayer Times

`GET /prayer-times/today`

Currently returns static Houston placeholder times. This must be replaced with either an authoritative table or a configured provider before production.

## Forms

`POST /forms`

`POST /forms/:type`

Allowed types: `contact`, `reminder`, `membership`, `volunteer`.

Body:

```json
{
  "name": "User Name",
  "email": "user@example.com",
  "phone": "555-555-5555",
  "message": "Optional message",
  "payload": {},
  "source": "website"
}
```

Returns a submission id and status. These submissions are stored in `app_form_submissions`.
