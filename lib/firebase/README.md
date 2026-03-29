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
  during migration. Import entry points also emit immediate fallback entity labels before the first remote Pinkka fetch
  resolves so the progress dialog does not sit in a blank waiting state, and whole-group refreshes publish stack totals
  immediately from the visible Pinkka stack list while refining species totals once detailed species payloads arrive.
  Direct canonical Pinkka imports and refreshes also mirror successful completion markers back into `/pinkka` so the
  management explorer can show imported/incomplete dots without scanning canonical groups, stacks, and species
  collections. Those large import and status-mirror writes now use smaller throttled Firestore commit windows so the
  browser-side write stream does not get exhausted near the end of wide re-imports, and already-complete group
  re-imports skip redundant descendant status rewrites entirely. Canonical learning items also keep only the stable
  Pinkka species id on `pinkkaRef` and in their Pinkka source record, so re-importing the same shared species from many
  stacks does not rewrite the item just to swap stack-local metadata. Batch status lookups for `/manage/pinkka` now read
  directly from those mirrored `/pinkka` import documents, stack resolution caches nested parent paths for repeated
  management-page access, `getStacksByParentGroupIds(...)` batches grouped stack inventory reads with chunked
  `parentGroupId in [...]` queries for `/manage/content`, canonical learning-item ID fetches are chunked with
  `documentId()` batching to avoid `N` point reads when resolving large linked-species lists, and import batch commits
  now use workload-based batch sizing plus adaptive retry/backoff for transient Firestore write-stream pressure instead
  of immediately falling back to many single-document writes. Pinkka management now queues `/pinkkaImportJobs` documents
  for backend processing instead of writing canonical imports directly from the browser, and those job docs also act as
  the shared progress channel for the management-wide pinned import toaster that follows the initiating user across
  `/manage/*` routes. The Pinkka job subscription now keeps a larger recent-job window so concurrent imports can stay
  visible in the management toaster instead of falling out of the feed too early, and terminal jobs persist
  acknowledgement back into Firestore through `acknowledgedAt` so dismissed import toasts do not return after refresh.
  Management toasts also recover stale active jobs that already have `interruptRequestedAt` set by finalizing them to
  `interrupted`, which prevents dead "running" toasts from lingering indefinitely after an old worker timeout. Learner
  stack inventory reads now retry one broad nested-stack query before falling back, which avoids noisy permission-denied
  console errors during auth-token startup races on the home page while keeping the grouped query as the preferred
  lower-request fast path. Management group and grouped-stack reads use the same retry strategy and fall back to
  per-group stack reads if the batched grouped query still fails, so `/manage/content` no longer loses all stacks when
  Firestore auth startup briefly lags behind the page render.
