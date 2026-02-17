# components

Reusable UI building blocks for app pages.

- `fabric-json-canvas.tsx`: Minimal uncontrolled Fabric.js canvas that initializes from JSON (`loadFromJSON`), keeps an
  internal serialized model (`toJSON`), and optionally fits a background image to the center of a dark-grey viewport.
- `fabric-leader-text-with-arrow.ts`: Custom Fabric.js element that combines a text label with a leader arrow whose
  start stays fixed at the text midpoint and whose endpoints are modeled as dedicated drag handles. Supports inline
  editing, configurable text alignment, multiple arrows per text box, arrow deletion by dragging an endpoint back to
  text (with cursor-adjacent trash affordance and deletion blocked only for the last remaining arrow), and creating new
  arrows by clicking a selection-visible round handle (with plus icon) and placing each endpoint with a second click.
  Empty-text mode hides the text box/placeholder, keeps arrow starts at the exact anchor point, and shows a square
  anchor handle plus add-arrow and "T" edit handles.
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
