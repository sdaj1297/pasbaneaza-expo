# Lovable UI Prompt

Create a modern, responsive frontend UI for the Anjuman Pasban-e-Aza website/app using this GitHub repository as project context:

https://github.com/sdaj1297/pasbaneaza-expo

Important: the current Expo UI in this repository is only a placeholder scaffold. Do not treat it as the desired visual design. Use it only to understand app structure, backend API expectations, data shape, and available assets.

## Brand And Audience

Anjuman Pasban-e-Aza serves the Houston azadari community. The UI should feel modern, elegant, respectful, mobile-first, and easy to use during high-traffic religious event days. Avoid generic SaaS styling, bland landing-page layouts, and overly playful visuals.

The design should feel distinct to Pasban-e-Aza:

- refined black/white/gold foundation
- restrained red accents where appropriate
- strong typography
- clear hierarchy for event time, host/contact name, location, and current status
- fast scanning on mobile
- accessible contrast

## Required Logo Assets

Use the Pasban-e-Aza logo from this repo:

- `assets/images/pasban-logo-white.png`
- `assets/images/pasban-logo-black.png`
- `assets/images/pasban-logo.png`

Use the white logo on dark surfaces and the black logo on light surfaces. The logo should be present in the primary header/app shell and should also work in special event/flyer contexts.

## Backend/API Context

The backend contract is documented in:

- `docs/api.md`
- `docs/data-model.md`
- `docs/database.md`
- `docs/migration-plan.md`

Assume the API base URL is configurable, e.g. `EXPO_PUBLIC_API_BASE_URL` or similar.

Core endpoints:

- `GET /api/home`
- `GET /api/events`
- `GET /api/events/today`
- `GET /api/events/:id`
- `GET /api/majlis-status/today`
- `PATCH /api/majlis-status/:eventId`
- `GET /api/announcements/active`
- `GET /api/meta/today`
- `GET /api/prayer-times/today`
- `POST /api/forms/:type`

Do not redesign the backend contract. Build the UI around it.

## Required Pages / Experiences

### Home

Create a polished home screen that can adapt when a special announcement/flyer is active.

Home should include:

- Pasban-e-Aza brand header
- today’s Gregorian and Islamic date
- active special event/banner/flyer area
- YouTube live stream embed area
- upcoming Anjuman events
- Islamic calendar observance if present
- announcements
- prayer times preview
- links to Instagram and YouTube
- clear calls to action for reminders, membership, and volunteering

### Events / Calendar

Create an event browsing experience for the community.

Must support:

- upcoming events
- filters: all, Anjuman, brothers, sisters, family
- date grouping
- event cards
- event detail page/modal
- event program rows from `EVENTS_DETAIL`
- map/address link behavior

The most important information should be scannable:

- time
- host/contact person
- event title
- location/address
- event type
- Anjuman schedule marker

### Majlis Status

Create a public tracker for today’s Anjuman schedule.

Must show:

- current majlis/status summary
- ordered event list for the Houston date
- status badges: Pending, En Route, Started, Completed, Delayed, Skipped
- current stage if present
- updated timestamp if present
- Google Maps route/address actions

This page is used live by the community, so it must be very legible on phones.

### Status Update/Admin

Create an open status-update view for now.

Must allow:

- selecting a majlis
- updating status
- optionally entering current stage
- submitting to `PATCH /api/majlis-status/:eventId`

Do not add a full auth flow yet, but design the screen so auth can be added later.

### Prayer Times

Create a clean prayer-times screen for Houston. Treat current data as placeholder until the backend source is finalized.

### Connect

Create forms for:

- reminders
- membership
- volunteering
- general contact

Submit to `POST /api/forms/:type`.

## Design Requirements

- Mobile-first responsive layout.
- Desktop should feel intentionally composed, not just stretched mobile.
- Avoid nested cards and clutter.
- Use clear icons where useful.
- Avoid visible instructional text explaining how the UI works.
- Make actions obvious without over-explaining.
- Typography should be polished and readable.
- Special event/flyer mode should feel prominent but not like a generic marketing hero.
- The app should feel usable as a web app now and adaptable to Expo/iOS/Android later.

## Deliverable Expectation

Generate a frontend that uses real API integration points where possible and clean placeholder/mock fallbacks only where needed. Keep the code structured so it can later be merged into or replace the placeholder Expo UI in this repository.
