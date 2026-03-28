# hooks

Client hooks for reusable UI-side data loading and interaction helpers.

- `use-pinkka-root-groups.ts`: loads Pinkka root groups once, caches them in memory, and refreshes their import-status
  dots with one batched Firestore status read per visible root-group list. Concurrent callers now share the same
  in-flight Pinkka request so controlled selection hydration and React dev re-renders do not duplicate the root fetch.
- `use-pinkka-group-stacks.ts`: loads and caches one Pinkka group's stacks, then refreshes stack import-status dots in
  one batched lookup for the visible stack column instead of one status request per row. In-flight group loads are
  deduped per group id.
- `use-pinkka-stack-species.ts`: loads and caches one Pinkka stack's species cards, then refreshes species import-status
  dots with one batched lookup for the visible species column. In-flight stack loads are deduped per stack id.
- `use-pinkka-species-detail.ts`: loads and caches the detailed Pinkka species payload for the active species card, with
  per-species in-flight request deduping.
- `use-toast.ts`: thin helper around the shared toast UI.
