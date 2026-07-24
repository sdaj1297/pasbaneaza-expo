# Pasban-e-Aza Beta QA Test Plan

This document is for community QA testers reviewing the Pasban-e-Aza beta website/app.

## Purpose

The beta should prove that the new app can reliably show Pasban-e-Aza schedules, community programs, majlis status, calendar data, and public forms before we move toward production.

The most important question for testers:

> Can a normal community member quickly find the correct program schedule and trust what they see?

## Test Environment

- Beta site: use the Netlify beta URL shared by the Pasban team.
- Data source: Firebase/Firestore beta data imported from the legacy MySQL database.
- Location/timezone: Houston, TX / America/Chicago.
- Admin pages require an authorized Pasban account. Treat all beta edits as test edits.

Do not enter sensitive personal information into beta forms.

## Devices To Cover

Please test on at least one:

- iPhone Safari
- Android Chrome
- Desktop Chrome, Edge, or Safari
- Tablet if available

Use both Wi-Fi and mobile data if practical.

## Feedback Format

For every issue, send:

- Page or feature
- Device and browser
- Steps to reproduce
- What you expected
- What actually happened
- Screenshot or screen recording if possible
- Date/time tested
- Severity: blocker, major, minor, suggestion

Example:

```text
Page: Calendar
Device: iPhone 15, Safari
Steps: Open /calendar, tap Anjuman, tap Download .ics
Expected: Calendar file downloads or opens in calendar app
Actual: Button does nothing
Severity: major
```

## Passing Integration Test

The beta passes integration QA when all of these are true:

- Home, Events, Calendar, Prayer, Status, Connect, and Admin pages load without crashes.
- Refreshing any page directly keeps the user on that page instead of showing an error.
- Event lists show approved/published events and do not show placeholders or waiting approval events.
- Anjuman schedule views only show events marked for the Anjuman schedule.
- "Today" behavior follows Houston time.
- Majlis status updates persist after refresh and are visible from another device.
- Calendar shows a full month grid with events on the correct dates.
- Calendar filters change the visible events correctly.
- Calendar export/download creates a usable `.ics` file with visible events.
- Islamic month length changes persist and affect Hijri date calculations.
- Public forms submit successfully or show a clear error.
- Mobile layouts are readable, usable, and do not have overlapping text.

## Core Test Cases

### 1. Navigation And Routing

Test:

- Open the home page.
- Navigate to each top-level page.
- Refresh each page directly.
- Copy/paste each page URL into a new browser tab.

Pass:

- Every route loads without "Something went wrong."
- Browser back/forward navigation works.
- Header/navigation remains usable on mobile and desktop.

### 2. Home Page

Test:

- Confirm the homepage immediately shows schedule/event information.
- Check any featured banner or special event area if one is active.
- Confirm upcoming events look accurate and readable.
- Compare today's Hijri date with the Calendar page for the same Gregorian day.
- Confirm the next committed majlis says whether it is later today, tomorrow, or on a future date.
- Mark today's committed event Completed and confirm it leaves both the next-majlis area and upcoming list.
- Confirm a later committed event becomes the next majlis.
- Open the page on mobile and desktop.

Pass:

- The schedule is easy to find without excessive scrolling.
- Event names, dates, times, and labels are readable.
- The next majlis includes its full Gregorian date and Hijri date.
- Every upcoming event shows both its Gregorian date and Hijri date.
- Today's Hijri date matches the admin-adjustable calendar mapping.
- Completed, skipped, and elapsed same-day events are not presented as next/upcoming.
- Started or En Route events are labeled as the current committed majlis.
- Featured flyer/banner does not hide the schedule.

### 3. Events Page

Test filters:

- All
- Anjuman
- Brothers
- Sisters
- Family

Pass:

- Filters change the list.
- Anjuman only shows committed Anjuman schedule events.
- Waiting approval and placeholder events do not appear.
- Event cards show contact/person name, title, time, date, and location clearly.
- Signed-in admins see a pencil action on every event card; signed-out users do not.
- A pencil opens a protected page containing only the selected event.
- Saving updates that event and returns clear success or error feedback.
- The admin dashboard does not render the entire event list as editable forms.

### 4. Calendar Page

Test:

- Open `/calendar`.
- Move to previous and next months.
- Tap Today.
- Use every filter.
- Compare calendar event dates against the Events page.
- Test on mobile and desktop.

Pass:

- The calendar renders as a complete month.
- Event chips appear on the correct date.
- Anjuman events are visually distinct.
- A compact Hijri day and month appear inside every calendar cell, including on mobile.
- The selected day's full Hijri date agrees with the compact date in its calendar cell.
- Islamic observances appear where expected.
- Mobile layout remains readable without horizontal scrolling.

### 5. Calendar Download And Sync

On web:

- Open Calendar.
- Select a filter.
- Tap Download `.ics`.
- Open/import the downloaded calendar file.

On iOS/Android native builds later:

- Tap Sync To Device.
- Grant calendar permission.
- Confirm events are added to the device calendar.

Pass:

- Exported events match the currently visible filtered calendar events.
- Event title, time, location, and notes are useful.
- Duplicate events are not repeatedly created during native sync.

Known beta note:

- On the Netlify web beta, Sync To Device uses the web `.ics` export path. True direct native calendar writing is for future iOS/Android builds.

### 6. Majlis Status Page

Test:

- Open `/status`.
- Confirm it shows today's Houston Anjuman schedule.
- Check event order.
- Check status labels and current stage display.
- While signed out, update a stop through each public status option.
- Set a stop to Started and select each available stage.
- Refresh the page.

Pass:

- Only today's Anjuman schedule appears.
- Status data remains after refresh.
- Public controls remain available without signing in.
- Status and stage changes appear after refresh and on another device.
- The current majlis/status area is understandable at a glance.

### 7. Admin Status Controls

Test:

- Open `/login`.
- Sign in with a legacy Pasban admin email/password.
- Open `/admin`.
- Change an event status to Pending, En Route, Started, Completed, Delayed, and Skipped.
- Refresh `/admin`.
- Open `/status` on another device/browser.

Pass:

- Legacy admin login succeeds.
- Non-admin users cannot access admin controls.
- Status updates save.
- Public status page reflects the update.
- No page crashes after repeated updates.

### 8. Islamic Month Length Admin

Test:

- Open `/admin`.
- Find Islamic Month Lengths.
- Select the current lunar year.
- Change one month between 29 and 30 days.
- Refresh the page.
- Reopen `/calendar` and check Hijri labels around that month boundary.

Pass:

- The selected length persists after refresh.
- Only 29 or 30 can be selected.
- Calendar Hijri labels respond to the updated month length.

Important:

- Coordinate before changing month lengths during shared testing. These edits affect everyone using the beta.

### 9. Prayer Page

Test:

- Open `/prayer`.
- Confirm the page loads and times are readable.
- Check mobile layout.

Pass:

- Prayer section displays clearly.
- Any placeholder/static nature is acceptable for beta only if labeled in internal notes.

### 10. Connect Forms

Test form types:

- Reminders
- Membership
- Volunteer
- Contact/general inquiry

Pass:

- Valid submissions succeed.
- Required fields are clear.
- Bad input shows a useful error or does not silently fail.
- No sensitive private data is required for beta testing.

## Visual QA

Check:

- Text does not overlap.
- Buttons are easy to tap on mobile.
- No tiny unreadable text.
- Long names and addresses wrap cleanly.
- Calendar cells remain stable when many events exist.
- The Pasban-e-Aza logo is clear.
- Dark theme contrast is comfortable.

Pass:

- A non-technical community member can use the app without explanation.

## Data QA

Spot-check:

- Event date
- Event time
- Contact/person name
- Address
- Anjuman schedule flag
- Event type/filter
- Flyer or social link if present

Pass:

- Beta data matches the imported legacy data closely enough for review.
- Any mismatch is reported with the event name, date, and expected value.

## Launch Readiness Checklist

Before wider community testing:

- Netlify deploy is green.
- Firestore rules are deployed.
- Firestore has future events, Islamic calendar years, and Islamic observances imported.
- Home and Calendar pages load on mobile Safari.
- Admin status update works.
- `.ics` export works.
- Known beta limitations are documented.

## Known Beta Limitations To Report Separately

These are not blockers unless they break a workflow:

- Visual design may continue evolving.
- Prayer times may still need the final production data source.
- Native calendar sync requires an actual iOS/Android build; web beta uses `.ics`.
- Admin event, calendar, and account controls require an authorized login.
