# scripts

Repository maintenance and Firebase configuration assets.

- `firestore.rules`: Firestore security rules for app and progress collections. Editors and admins can manage content
  collections (`groups`, nested `stacks`, and `species`) so direct Pinkka imports and regular content management do not
  fail on owner-only update restrictions.
- `firestore.indexes.json`: Composite index definitions for learning-progress and scientific-progress queries.
- `fetch-pinkka-assets.mjs`: Utility for downloading or reconciling Pinkka-related assets.
