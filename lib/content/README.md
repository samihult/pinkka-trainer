# lib/content

Helpers for presenting localized content and taxonomy-oriented management views.

- `content-display.ts`: localized text and image helpers shared by cards, forms, and learning surfaces.
- `species-taxonomy-tree.ts`: fixed-rank taxonomy hierarchy builder shared by the canonical species inventory and
  stack-specific taxonomy tree views, including collapsed-by-default expansion rules, single-open-path calculation, and
  focus-target ancestor opening with one-child auto-cascade.
