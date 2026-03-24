# lib/firebase

Firebase integration layer for app data and auth-connected persistence.

- `firebase-config.ts`: Firebase app/service initialization.
- `firestore-helpers.ts`: Firestore CRUD and aggregate helpers, including species-level learning progress, stack
  histograms for species/genus/family test scopes with legacy compatibility fallbacks, cached mastered-scientific-name
  summaries for stack, group, and global card progress, and aggregate species-count helpers used by home-page
  performance paths. Pinkka import writes are chunked by both write count and an estimated payload budget so large
  image-heavy imports stay under Firestore commit request limits, and editable-group creation from imported Pinkka
  content reuses source image URLs directly to avoid large waves of Storage lookups during creation.
