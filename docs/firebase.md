# Firebase Backend

The Netlify beta can use Firebase directly from the Expo app by setting:

```env
EXPO_PUBLIC_DATA_BACKEND=firebase
```

Keep the existing API backend available with:

```env
EXPO_PUBLIC_DATA_BACKEND=api
```

## Netlify Environment Variables

Set these from the Firebase web app config. These values are public client config, but keep them in environment variables so beta/prod projects can differ cleanly.

```env
EXPO_PUBLIC_DATA_BACKEND=firebase
EXPO_PUBLIC_FIREBASE_API_KEY=<from Firebase config>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<from Firebase config>
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<from Firebase config>
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<from Firebase config>
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<from Firebase config>
EXPO_PUBLIC_FIREBASE_APP_ID=<from Firebase config>
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=<from Firebase config>
```

For the current beta project, use the Firebase config from `pasbaneaza-beta`.

## Firestore Collections

```text
events/{eventId}
eventDays/{yyyy-mm-dd}
eventDays/{yyyy-mm-dd}/items/{eventId}
majlisStatus/{yyyy-mm-dd}/events/{eventId}
banners/{bannerId}
islamicCalendar/{lunarYear}
islamicEvents/{eventId}
settings/home
settings/prayerTimes
submissions/{submissionId}
```

`events` is the canonical public event list.

`eventDays/{date}/items/{eventId}` is a denormalized daily schedule so the status page can read only today's committed Anjuman schedule.

`majlisStatus/{date}/events/{eventId}` is community writable for now and can later be protected by Firebase Auth.

`banners` controls homepage flyer/special event mode.

`islamicCalendar/{lunarYear}` mirrors legacy `ISLAMIC_CALENDAR`: each document has `year`, `firstDate`, and twelve month length rows. The beta admin page can update month lengths to 29 or 30 days.

`islamicEvents` mirrors active legacy `ISLAMIC_EVENTS` rows for calendar observance labels.

`submissions` is write-only from the public app.

Event submissions are stored as `type: "event"` with `status: "pending_review"`. They are review queue records only; they are not written into `events` or `eventDays` until approved by an admin workflow.

## Event Document Shape

```json
{
  "id": "4439",
  "title": "Salana Majalis",
  "contactName": "Zafar Syed",
  "date": "2026-06-28",
  "time": "1:30 PM",
  "islamicDate": "13 Muharram, 1448",
  "type": "M",
  "locationName": "Residence",
  "address": "14903 Lake Woodbridge Court, Sugar Land, TX 77498",
  "flyer": "",
  "socialUrl": "",
  "isAnjumanSchedule": true,
  "isPublished": true,
  "waitingApproval": false
}
```

Legacy import rules:

- `isPublished` must reflect `EVENTS.PUBLISH = 1`.
- Exclude `EVENTS.PLACE_HOLDER = 1`.
- Exclude `EVENTS.WAITING_APPROVAL = 1`.
- `isAnjumanSchedule` must reflect `EVENTS.ADDTOSCHD = 1`.
- Only import future/current events for beta unless we deliberately need history.

## Banner Document Shape

```json
{
  "title": "Markazi Ashura Juloos",
  "eyebrow": "Featured Event",
  "dateLabel": "10 Muharram",
  "description": "Program details",
  "flyerUrl": "https://example.com/flyer.jpg",
  "liveStreamUrl": "https://www.youtube.com/embed/...",
  "isActive": true,
  "startsAt": "2026-06-20",
  "endsAt": "2026-06-30"
}
```

## Rules

Copy `firestore.rules` into Firebase Console -> Firestore Database -> Rules, or deploy it later with Firebase CLI.

For beta:

- Public users can read schedules, settings, and banners.
- Public users can create/update only constrained majlis status fields.
- Public users can create form submissions.
- Public users cannot directly create/edit/delete events or banners.

Admin-only writes should use Firebase Auth custom claims. The beta import script sets `admin: true` for legacy admins.

## Legacy Admin Login

The legacy production site stores admin users in `SYS_USERS` and verifies `SYS_USERS.ADMIN_CODE` with PHP `password_verify`.

For the Firebase beta, import those users into Firebase Authentication so they can sign in with the same email/password:

1. In Firebase Console, enable Authentication -> Sign-in method -> Email/Password.
2. Point local `.env` or command environment variables at the cloned legacy MySQL database.
3. Set `FIREBASE_PROJECT_ID`.
4. Set `GOOGLE_APPLICATION_CREDENTIALS` to the Firebase service-account JSON.
5. Run:

```bash
npm run firebase:import-users
```

The import script:

- Reads `SYS_USERS`.
- Imports the existing bcrypt password hashes into Firebase Auth.
- Sets custom claims:
  - `admin: true|false`
  - `adminType`
  - `legacyUserId`

The Expo app uses Firebase Auth for `/login`. Admin-only Firestore writes should check `request.auth.token.admin == true`.

## Importing From Legacy MySQL

The importer reads through the existing SQL service layer so it preserves the legacy event filters and field normalization.

Requirements:

- Local `.env` points to the cloned/beta MySQL database.
- `FIREBASE_PROJECT_ID` is set.
- Either `GOOGLE_APPLICATION_CREDENTIALS` points to a Firebase service-account JSON file, or Application Default Credentials are configured.

Run:

```bash
npm run firebase:import
```

Optional import controls:

```env
FIRESTORE_IMPORT_FROM_DATE=2026-01-01
FIRESTORE_IMPORT_LIMIT=250
```

The importer writes:

- `events/{eventId}`
- `eventDays/{date}`
- `eventDays/{date}/items/{eventId}`
- `banners/{bannerId}`
- `islamicCalendar/{lunarYear}`
- `islamicEvents/{eventId}`
- `settings/home`

It does not delete old Firestore documents yet. For beta, re-importing overwrites matching IDs and leaves unmatched documents alone.
