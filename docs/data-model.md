# Data Model

## Strategy

The backend uses the legacy MySQL schema as the authoritative read source and adds small `app_*` tables for new app behavior.

This avoids a risky full migration before the new UI is stable.

## Legacy Source Tables

`EVENTS`

- Authoritative event records.
- Contains contact, location, event date/time, approval flags, event type, flyer/social fields, and Anjuman schedule flag.

`CENTERS`

- Location records for formal centers.
- Also includes non-center choices like `Residence`.

`EVENTS_DETAIL`

- Program rows for one event.
- Used by `GET /api/events/:id`.

`ANNOUNCEMENTS`

- Date-ranged homepage announcements and flyer banners.
- `FULL_PAGE = 1` is treated as featured-banner eligible.

`ANJUMAN_EVENTS`

- Legacy standalone Anjuman event list.
- Keep for audit for now; not yet used as the primary schedule source.

`ISLAMIC_CALENDAR`

- Lunar year start dates and month lengths.
- Used to calculate local Islamic date.
- Month lengths remain editable as 29 or 30 days so admins can adjust the calendar after moonsighting.

`ISLAMIC_EVENTS`

- Observances by Islamic month/day.
- Used by the full calendar grid to label days such as Ashura, Arbaeen, Eid-e-Ghadeer, and other configured observances.

`SAYINGS`

- Active quote/saying rotation.

`SYS_USERS`

- Legacy admin users.
- Not used for new auth yet.

## New App Tables

`app_majlis_status`

- `event_id`
- `event_date`
- `status`
- `stage`
- `source`
- `updated_by`
- `updated_at`

Purpose: durable status overlay for Anjuman schedule events. The base event remains in `EVENTS`; this table only stores live/current status.

`app_form_submissions`

- `submission_type`
- `name`
- `email`
- `phone`
- `message`
- `payload_json`
- `source`
- `status`

Purpose: store reminder, membership, volunteer, and contact submissions until a CRM/admin workflow exists.

## Calendar Export

The calendar grid is derived, not stored:

- Load approved public `EVENTS` rows for the visible Gregorian month grid.
- Calculate each day's Hijri date from `ISLAMIC_CALENDAR`.
- Attach matching `ISLAMIC_EVENTS` rows by Islamic month/day.
- Generate `.ics` output from the same filtered event set.

On native Expo builds, visible events can be written into a local device calendar through `expo-calendar`. On web/Netlify, the same visible event set is exported as a downloadable `.ics` file.

## Event Type Semantics

Current filters:

- `brothers`: `ETYPE in ('M', 'F', 'A')`
- `sisters`: `ETYPE in ('W', 'F', 'A')`
- `family`: `ETYPE in ('F', 'A')`
- `anjuman`: requires `ADDTOSCHD = 1`

These should be verified with the Pasban team before final launch because legacy labels may not perfectly match current community expectations.

## Firestore Community Events

The production Expo application stores canonical schedule records in `events`
and duplicates each record under `eventDays/{date}/items` for date-oriented
reads.

Community event publication and Anjuman participation are independent:

- Public submissions create `isPublished=true`, `isAnjumanSchedule=false`,
  `waitingApproval=false`, and `isPlaceholder=false`.
- `isPlaceholder=true` always forces `isPublished=false` and keeps the record
  from being treated as a published event. The Schedule page may render a
  sanitized reservation card containing only the holder name, date, and time.
- `anjumanApprovalStatus` is `not_requested`, `pending`, `approved`, or
  `declined`.
- Only `approved` records are placed on the Anjuman schedule.
- A pending or declined Anjuman request remains visible as a normal community
  event.

Contact email and phone remain in the admin-only `submissions` collection and
are not copied into public event documents.
