# components

Reusable UI building blocks for app pages.

- `fabric-json-canvas.tsx`: Minimal uncontrolled Fabric.js canvas that initializes from JSON (`loadFromJSON`), keeps an
  internal serialized model (`toJSON`), and optionally fits a background image to the center of a dark-grey viewport.
- `fabric-leader-text-with-arrow.ts`: Custom Fabric.js element that combines a text label with a leader arrow whose
  start stays fixed at the text midpoint and whose endpoint is modeled as a single point with a dedicated drag handle,
  plus inline editing and configurable text alignment.
- `ui/`: Shared shadcn/ui primitives and micro-components (for example keyboard shortcut hints).
- Route-level reusable pieces such as navigation (Varjopinkka brand icon via Lucide), protected route wrapper, and
  management cards.
- Feature-specific UI for learning, tests, and Pinkka content workflows, including `species-card.tsx` for side-by-side
  learning media and info tabs (including author-managed multilingual identification hint rendering and Pinkka textual
  detail rendering in the Pinkka tab without duplicate images, plus hint-linked carousel navigation from the
  identification tab), `species-form.tsx` for tabbed species editing (information, pictures, identification hints with
  optional stable image references), `image-grid-selector.tsx` for reusable single/multi image selection grids, and
  `species-identification-hint-dialog.tsx` for modal editing of individual hints (including framed preview +
  change/delete controls for referenced species images), and `species-image-carousel.tsx` for keyboard-driven image
  navigation/zoom (with learning view support up to 200% full-screen zoom and modal-state callbacks), plus
  `learning-session-shell.tsx` for shared learning headers with segmented species progress integration.
