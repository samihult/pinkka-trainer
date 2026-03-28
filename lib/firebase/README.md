# lib/firebase

Firebase integration layer for app data and auth-connected persistence.

- `firebase-config.ts`: Firebase app/service initialization.
- `firestore-helpers.ts`: Firestore CRUD and aggregate helpers, including species-level learning progress, stack
  histograms for species/genus/family test scopes with legacy compatibility fallbacks, cached mastered-scientific-name
  summaries for stack, group, and global card progress, and aggregate species-count helpers used by home-page
  performance paths. Pinkka import writes are chunked by both write count and an estimated payload budget so large
  image-heavy imports stay under Firestore commit request limits, and editable-group creation from imported Pinkka
  content now creates system-owned nanoid-based ids for canonical groups, stacks, and learning items, stores canonical
  learning items in top-level `/learning-items` documents, and links stacks to shared items through ordered
  `learningItemIds` arrays while mirroring legacy `speciesIds` during migration. Source-backed entities preserve
  original Pinkka snapshots in generic `sourceRecords` metadata, apply manual edits as `manualOverrides`, and merge the
  editable view on read/update so refreshes do not overwrite editor changes. Pinkka import/sync now writes canonical app
  entities directly instead of staging content under `/pinkka`, and Pinkka references remain in `pinkkaRef` metadata
  rather than owning canonical document ids. Imported species taxonomy chain data is copied from Pinkka detail payloads,
  genus/family labels come directly from taxonomy ranks (`MX.genus`/`MX.family`) without fallback derivation, and
  refresh flows preserve existing taxonomy-rich species data when only lightweight Pinkka species cards are available.
  Import/sync image mapping now prefers Pinkka source URLs during sync work so missing cached Firebase Storage copies do
  not trigger noisy 404 lookups while content is being imported or refreshed. Large Pinkka imports also fetch species
  details with bounded concurrency so the browser does not exhaust network resources on wide stacks or whole-group
  imports. First-time whole-group imports now commit the canonical group immediately and then import one stack at a
  time, so Firestore writes and progress updates start incrementally instead of waiting for every stack’s species
  details to be prepared up front. The helper surface now prefers `learning item` naming (`getLearningItems`,
  `createLearningItem`, `updateLearningItem`, etc.) while keeping deprecated `species` aliases available temporarily
  during migration.
