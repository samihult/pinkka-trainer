# components/home

Home page-specific UI components.

- `home-page-client.tsx`: Front page data loader and collection-grid container. It renders only group cards, derives
  image fallbacks from group/stack data, applies a client-side text filter, loads card content first for faster first
  paint, then resolves mastered scientific-name progress and aggregate species counts per group in the background,
  persists favorite groups in Firebase, and keeps favorites sorted first.
- `group-page-client.tsx`: Collection detail page container. It loads one group, renders its stacks as learner-facing
  cards, resolves lightweight species counts first for faster initial paint, hydrates mastered scientific-name progress
  and missing species counts in the background, persists favorite stacks in Firebase, and keeps stack favorites sorted
  first.
- `home-card-utils.ts`: Shared image-url resolver for collection and stack cards.
- `home-group-card.tsx`: Figma-inspired collection card with hero image, persisted favorite toggle, mastered
  scientific-name progress bar, and species-count footer.
- `home-stack-card.tsx`: Figma-inspired stack card with hero image, persisted favorite toggle, mastered scientific-name
  progress bar, and Learn / Take Test actions.
