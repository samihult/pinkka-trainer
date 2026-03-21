# lib/firebase

Firebase integration layer for app data and auth-connected persistence.

- `firebase-config.ts`: Firebase app/service initialization.
- `firestore-helpers.ts`: Firestore CRUD and aggregate helpers, including learning progress and stack outcome histogram
  persistence. Pinkka import writes are chunked by both write count and an estimated payload budget so large image-heavy
  imports stay under Firestore commit request limits, and editable-group creation from imported Pinkka content reuses
  source image URLs directly to avoid large waves of Storage lookups during creation.
