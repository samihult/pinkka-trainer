# functions

Firebase Cloud Functions for backend aggregation and cache maintenance.

- `src/index.js`: Firestore triggers for mastered scientific-name progress summaries on stack, group, and global scopes,
  plus the region-pinned Firestore job trigger that starts backend Pinkka imports from `/pinkkaImportJobs`.
- `src/pinkka-import-jobs.js`: backend Pinkka import job worker that processes Firestore-queued import jobs, writes
  canonical groups/stacks/learning-items with admin privileges, mirrors Pinkka import-status markers for the explorer,
  and persists throttled job progress snapshots for management toasts.
- `package.json`: Function runtime dependencies for `firebase-admin` and `firebase-functions`.

These functions are not part of the Next.js app build. Install the dependencies in `functions/` before deploying or
typechecking the backend runtime.
