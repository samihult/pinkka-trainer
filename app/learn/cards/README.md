# app/learn/cards

Learning mode routes for stack-based species practice sessions.

- `[stackId]/page.tsx`: Session container that loads stack species with images, tracks progress, persists info-pane
  visibility in query state, renders the interactive species learning view, and wires segmented progress-bar species
  navigation with a shared animated scientific + vernacular top hover box (shown only while the info pane is open).
