# scripts

Repository maintenance and Firebase configuration assets.

- `firestore.rules`: Firestore security rules for app and progress collections. Editors and admins can manage content
  collections (`groups`, nested `stacks`, and `species`) so direct Pinkka imports and regular content management do not
  fail on owner-only update restrictions, and admins can enqueue/interruption-control their own `pinkkaImportJobs` while
  backend functions write the authoritative job progress.
- `firestore.indexes.json`: Composite index definitions for learning-progress, scientific-progress, and Pinkka import
  job subscription queries.
- `fetch-pinkka-assets.mjs`: Utility for downloading or reconciling Pinkka-related assets.
