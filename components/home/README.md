# components/home

Home page-specific UI components.

- `home-page-client.tsx`: Front page data loader and collection-grid container. It renders only group cards, derives
  live species counts and image fallbacks from group/stack data, and applies a client-side text filter.
- `home-group-card.tsx`: Figma-inspired collection card with hero image, mock favorite toggle, mock mastery percentage,
  and species-count footer.
- `mock-home-group-stats.ts`: Stable mock presentation values for favorite and mastery indicators until the production
  metrics are designed.
