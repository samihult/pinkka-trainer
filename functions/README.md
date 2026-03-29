# functions

Firebase Cloud Functions for backend aggregation and cache maintenance.

- `src/index.js`: Firestore triggers for mastered scientific-name progress summaries on stack, group, and global scopes,
  plus the region-pinned Firestore job trigger that starts backend Pinkka imports from `/pinkkaImportJobs`. The Pinkka
  worker trigger uses an extended timeout and elevated memory so whole-group imports do not get stranded in `running`
  after hitting the default one-minute Cloud Run window or the smaller baseline memory limit.
- `src/pinkka-import-jobs.js`: backend Pinkka import job worker that processes Firestore-queued import jobs, writes
  canonical groups/stacks/learning-items with admin privileges, mirrors Pinkka import-status markers for the explorer,
  and persists throttled job progress snapshots for management toasts. The worker now also emits explicit start,
  completion, interruption, and failure logs keyed by job id so stuck imports can be diagnosed from Cloud Functions logs
  instead of only from Firestore job state.
- `package.json`: Function runtime dependencies for `firebase-admin` and `firebase-functions`.

These functions are not part of the Next.js app build. Install the dependencies in `functions/` before deploying or
typechecking the backend runtime.
