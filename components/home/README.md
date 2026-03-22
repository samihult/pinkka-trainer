# components/home

Home page-specific UI components.

- `home-page-client.tsx`: Front page data loader and collection-grid container. It renders only group cards, derives
  live species counts and image fallbacks from group/stack data, applies a client-side text filter, persists favorite
  groups in Firebase, and keeps favorites sorted first.
- `group-page-client.tsx`: Collection detail page container. It loads one group, renders its stacks as learner-facing
  cards, persists favorite stacks in Firebase, and keeps stack favorites sorted first.
- `home-card-utils.ts`: Shared image-url resolver for collection and stack cards.
- `home-group-card.tsx`: Figma-inspired collection card with hero image, persisted favorite toggle, mock mastery
  percentage, and species-count footer.
- `home-stack-card.tsx`: Figma-inspired stack card with hero image, persisted favorite toggle, mock mastery percentage,
  and Learn / Take Test actions.
- `mock-home-group-stats.ts`: Stable mock mastery presentation values until the production metric is designed.
