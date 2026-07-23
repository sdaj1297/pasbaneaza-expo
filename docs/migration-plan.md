# Migration Plan

## Current Phase

Use the existing MySQL export as the read model and add minimal app-owned tables for new workflows.

Run:

```powershell
npm run db:migrate
npm run verify:api
```

## Phase 1: Compatibility Backend

- Keep reading events from `EVENTS` and `CENTERS`.
- Keep reading program lines from `EVENTS_DETAIL`.
- Keep reading announcements from `ANNOUNCEMENTS`.
- Keep reading Islamic calendar data from `ISLAMIC_CALENDAR` and `ISLAMIC_EVENTS`.
- Store new majlis status rows in `app_majlis_status`.
- Store form submissions in `app_form_submissions`.

This phase is what the Lovable frontend should integrate against.

## Phase 2: Data Cleanup

- Fix legacy text encoding issues in source data where rows contain stored replacement characters like `???`.
- Normalize common city/state typos such as `Te` where appropriate.
- Decide whether old `ANNOUNCEMENTS` HTML should remain raw HTML or be converted to structured banner records.
- Confirm final event type semantics with the organization.

## Phase 3: Modern Schema

Only after the UI and workflows are stable, create a clean long-term schema:

- `events`
- `locations`
- `event_program_items`
- `announcements`
- `special_events`
- `majlis_status`
- `form_submissions`
- `admin_users`

Then migrate legacy rows into the clean schema and retire compatibility queries.

## Open Decisions

- Prayer times source: static table, admin-managed table, or external provider.
- Auth timing: leave status updates open initially or add lightweight admin/community codes before launch.
- Firestore: keep only if realtime updates become necessary. SQL should be the durable source.
- Special event banners: continue using `ANNOUNCEMENTS` or create `special_events` as a dedicated table.
