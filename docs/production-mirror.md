# Production MySQL Mirror

Production MySQL remains authoritative. The beta application reads a Firestore
mirror plus beta-only overrides; it never writes changes back to production.

## Netlify environment

Configure these variables in the Netlify site:

```text
FIREBASE_PROJECT_ID=pasbaneaza-beta
FIREBASE_SERVICE_ACCOUNT_JSON=<single-line service-account JSON>
PASBAN_SYNC_SHARED_SECRET=<long random value shared with cPanel>
PROD_SYNC_SNAPSHOT_URL=https://pasbaneaza.org/internal/firestore-sync/v1/snapshot
PROD_SYNC_DRY_RUN=true
```

Keep dry-run enabled for the first deployment. The scheduled function runs every
five minutes. Administrators can also trigger a run from the Production Mirror
card in the beta admin page.

## Firestore collections

- `prodMirrorEvents`: protected normalized production baseline
- `betaEventOverrides`: beta-only changes and deletion markers
- `events`, `eventDays`: effective schedule consumed by the beta UI
- `prodSyncState`: current health and counts
- `prodSyncManifests`: hashes from completed synchronizations
- `prodSyncConflicts`: beta overrides displaced by newer production changes

Existing majlis status, submissions, memberships, reminders, and authentication
remain beta-only.

## Rollout

1. Deploy Netlify with `PROD_SYNC_DRY_RUN=true`.
2. Deploy the production endpoint and migrate the outbox table.
3. Trigger a manual sync and review the Netlify function log.
4. Set `PROD_SYNC_DRY_RUN=false` and trigger the first import.
5. Compare production and Firestore counts and event ordering.
6. Enable the cPanel one-minute dispatcher cron.
7. Confirm the admin freshness indicator updates and no conflicts are present.

If a synchronization fails, the previous Firestore data remains intact. Fix the
failure and trigger another run; never clear the public collections as recovery.
