# Production Data Import

Firestore is the canonical database for the rebuilt application. The retired
MySQL mirror, override, conflict, and scheduled synchronization paths are not
used at runtime.

## One-time migration

The migration tool reads the isolated local MySQL restore and writes normalized
records directly to `events`, `eventDays`, `centers`, `specialEvents`,
`islamicCalendar`, `islamicEvents`, `banners`, and `settings`.

```powershell
npm run firebase:rebuild -- dry-run
npm run firebase:rebuild -- apply
npm run firebase:rebuild -- verify
```

`apply` refuses to proceed unless the expected SQL counts, Shab-e-Aza event,
excluded legacy announcement, and preserved banner are present. It creates a
compressed Firestore backup before clearing application collections.

The Shab-e-Aza banner `banners/beta-shab-e-aza-2026` is restored byte-for-byte
at the field level. SQL announcement `9` is excluded, while SQL event `4378`
remains the canonical schedule entry. One public event contact number is
selected from `CONTACT_CELL` or `CONTACT_PHONE`; email addresses, passwords,
and sessions are never selected from MySQL.

Firebase Authentication is a separate service and is not modified by the
Firestore rebuild.

## Runtime behavior

Public and admin event reads query canonical `events` by date. Admin edits and
deletions write directly to `events` and `eventDays`. The public schedule keeps
the existing published, placeholder, waiting-approval, Anjuman, and Houston
timezone rules.
