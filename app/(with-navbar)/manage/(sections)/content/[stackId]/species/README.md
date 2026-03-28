# manage/(sections)/content/[stackId]/species

Stack-specific species management screens.

- `page.tsx`: taxonomy-tree view for one stack's linked canonical species. The page now fetches only the stack and its
  linked species up front, and loads the global canonical species inventory lazily when the editor opens the
  link-existing dialog.
- `[speciesId]/page.tsx`: create/edit route for one stack-linked species entry.
