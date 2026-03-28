# manage/(sections)/content

Group and stack management screens for canonical content.

- `page.tsx`: editor-facing overview for groups and stacks, including Pinkka refresh actions. The overview now prefers
  one aggregated stack read via the shared helper instead of one Firestore stack query per group on initial load, while
  still backfilling legacy `group.stackIds` relationships in one bounded batch.
- `[stackId]/species/page.tsx`: taxonomy-tree view of the learning items linked to one stack, with linking and create
  flows for shared canonical species. The tree starts collapsed, keeps only one fully open path at a time, honors
  `?item=<node-id>` for deep links into the hierarchy, and supports a URL-backed taxonomy/species filter via `?q=`. The
  link-existing dialog now loads the global canonical species inventory lazily so simply opening a stack no longer pulls
  the full learning-item corpus by default.
- `[stackId]/species/[speciesId]/page.tsx`: create/edit route for one stack-linked species entry.
