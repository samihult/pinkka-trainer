# manage

Editor-facing management routes for canonical content and source-linked imports.

- `manage-tabs.tsx`: top-level editor navigation across species, groups, and Pinkka import tools.
- `page.tsx`: default redirect into the canonical learning-item inventory.
- `(sections)/content/`: group and stack management, including stack-to-learning-item linking and resilient per-group
  stack loading for shared editor views, with stack species displayed through the shared taxonomy tree.
- `(sections)/species/`: canonical learning-item inventory and detail editing screens that still use species routes in
  the UI, with the inventory rendered as a fixed-rank taxonomy tree.
- `(sections)/pinkka/`: Pinkka import and source browsing flows.
