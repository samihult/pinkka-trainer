# components/pinkka

Pinkka-specific management and explorer UI.

- `pinkka-explorer.tsx`: finder-style Pinkka browser that keeps loader configs stable while import-status dots refresh,
  so progress updates do not trigger unnecessary hierarchy reloads. The explorer now consumes batched status maps from
  the Pinkka hooks, so visible group/stack/species columns resolve their import dots with one batched status read per
  column instead of one lookup per rendered row. Its controlled selection also rides on the shared finder suppression
  for transitional hydration updates, which keeps URL-backed Pinkka navigation from repeatedly replacing the route while
  columns are still loading. The underlying Pinkka hooks also dedupe concurrent in-flight fetches, which trims duplicate
  API calls during controlled-path hydration and React development re-renders.
- `pinkka-import-status-context.tsx`: lightweight provider used by the explorer so row components can read the latest
  status maps without rebuilding finder type configs or triggering hierarchy reloads.
- `pinkka-*-item.tsx`: row renderers for groups, stacks, and species that now render preloaded import-state indicators
  from the shared explorer context instead of running their own per-row Firestore effects.
- `type-configs/`: finder column config factories for Pinkka explorer columns and details panels.
