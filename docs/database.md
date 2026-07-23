# Pasban Database Notes

The current export is `pasban-db.sql` and comes from MySQL 5.7.

## Legacy Tables Used

- `EVENTS`: community event submissions and approved/published majalis.
- `CENTERS`: centers plus special non-center rows such as `Residence` and `Other Location`.
- `EVENTS_DETAIL`: flyer/program lines for an event.
- `ANNOUNCEMENTS`: date-ranged homepage announcements.
- `ANJUMAN_EVENTS`: small standalone Anjuman event list.
- `ISLAMIC_CALENDAR` and `ISLAMIC_EVENTS`: lunar date calculations and observances.
- `SAYINGS`: homepage quote rotation.
- `SYS_USERS`: legacy admin users.

## Required Legacy Filters

- Public events: `PUBLISH = 1`, `PLACE_HOLDER = 0`, `WAITING_APPROVAL = 0`.
- Anjuman schedule: public filters plus `ADDTOSCHD = 1`.
- Today status board: Anjuman schedule plus `date(EVENT_DATE) = today`.

## New App Tables

Created by `npm run db:migrate`:

- `app_migrations`: tracks applied backend migrations.
- `app_majlis_status`: durable status overlay keyed by `(event_id, event_date)`.
- `app_form_submissions`: contact, reminder, membership, and volunteer submissions.

## Current Decision

Use compatibility adapters over the legacy schema first. Do not rewrite the full data model before the frontend is validated.

Reason:

- The legacy schema already contains production event, center, calendar, announcement, and user data.
- The frontend needs stable API contracts more urgently than a full database replacement.
- New behavior that does not exist in the legacy schema should go into `app_*` tables.

The future production migration can move from compatibility adapters to a clean schema once the Lovable frontend and final workflows are locked.
