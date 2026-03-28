# manage/(sections)/content

Group and stack management screens for canonical content.

- `page.tsx`: editor-facing overview for groups and stacks, including resilient per-group stack loading and Pinkka
  refresh actions.
- `[stackId]/species/page.tsx`: taxonomy-tree view of the learning items linked to one stack, with linking and create
  flows for shared canonical species. The tree starts collapsed, keeps only one fully open path at a time, honors
  `?item=<node-id>` for deep links into the hierarchy, and supports a URL-backed taxonomy/species filter via `?q=`.
- `[stackId]/species/[speciesId]/page.tsx`: create/edit route for one stack-linked species entry.
