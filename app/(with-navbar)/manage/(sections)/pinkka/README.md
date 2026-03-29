# manage/(sections)/pinkka

Pinkka browsing and import management screens.

- `page.tsx`: explorer-driven view of Pinkka groups, stacks, and species, with import/re-import actions for the current
  selection. Import actions now enqueue backend `/pinkkaImportJobs` instead of running write-heavy sync work in the
  browser, while import-status refreshes still reuse existing explorer loaders so progress updates do not refetch the
  full Pinkka hierarchy on every tick. The page now allows multiple backend jobs to be in flight at the same time, only
  disables actions for the exact selection that is already importing, and relies on the shared management toaster for
  sticky completion/interruption feedback with deep links back into the Pinkka browser. Controlled query-string
  selection also avoids transitional route updates while the finder columns are still hydrating the requested path.
