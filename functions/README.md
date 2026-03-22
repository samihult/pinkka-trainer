# functions

Firebase Cloud Functions for backend aggregation and cache maintenance.

- `src/index.js`: Firestore triggers for mastered scientific-name progress summaries on stack, group, and global scopes.
- `package.json`: Function runtime dependencies for `firebase-admin` and `firebase-functions`.

These functions are not part of the Next.js app build. Install the dependencies in `functions/` before deploying or
typechecking the backend runtime.
