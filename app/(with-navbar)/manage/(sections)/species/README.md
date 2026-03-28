# manage/(sections)/species

Canonical learning-item management screens that currently keep species-based routes.

- `page.tsx`: fixed-rank taxonomy tree inventory that groups canonical species under domain → kingdom → phylum → class →
  order → family → genus before the final species leaves. The tree starts collapsed, keeps only the query-selected path
  open, accepts `?item=<node-id>` to expand/focus any hierarchy node or species leaf, and includes a local filter that
  temporarily highlights the first matching species without changing the URL while still allowing filtered item clicks
  to hand focus back to the tree.
- `[speciesId]/page.tsx`: create/edit form for canonical learning-item documents that can be linked into many stacks.
