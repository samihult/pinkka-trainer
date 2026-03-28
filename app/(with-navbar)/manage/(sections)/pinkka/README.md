# manage/(sections)/pinkka

Pinkka browsing and import management screens.

- `page.tsx`: explorer-driven view of Pinkka groups, stacks, and species, with import/re-import actions for the current
  selection. Import-status refreshes now reuse existing explorer loaders so progress updates do not refetch the full
  Pinkka hierarchy on every tick, and controlled query-string selection now avoids transitional route updates while the
  finder columns are still hydrating the requested path.
