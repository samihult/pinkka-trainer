# components/pinkka/type-configs

Finder column definitions for the Pinkka explorer.

- `root-type-config.tsx`: root column setup for loading top-level Pinkka groups.
- `group-type-config.tsx`, `stack-type-config.tsx`, `species-type-config.tsx`: list-column configs for each Pinkka
  hierarchy level. They now stay focused on rendering and child loading while the import-status context handles status
  dots separately, so refreshes do not rebuild loader functions.
- `species-detail-type-config.tsx`: details panel renderer for a selected Pinkka species.
