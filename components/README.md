# components

Reusable UI building blocks for app pages.

- `fabric-json-canvas.tsx`: Uncontrolled Fabric.js canvas that initializes from JSON (`loadFromJSON`) and optionally
  fits a background image to the center of a dark-grey viewport. Includes a left-side tool toolbar (pointer, hand, text,
  arrow, circle, ellipse, rectangle), draw interactions that support both drag/drop and two-click placement for
  geometry/leader creation, plus trackpad two-finger drag panning and pinch zooming (including gesture pinch events) and
  a toolbar reset-viewport button that restores the initial pan/zoom state. Tool/reset shortcuts are: `V` pointer, `H`
  hand, `T` text, `A` arrow, `C` circle, `E` ellipse, `R` rectangle, and `Z` reset viewport. The toolbar also includes a
  selection-aware delete button with shortcut `⌫` (Backspace/Delete). A `constantScreenSize` prop (default `true`) keeps
  text and stroke visuals at constant screen size independent of zoom.
- `fabric-leader-text-with-arrow.ts`: Custom Fabric.js element that combines a text label with a leader arrow whose
  start stays fixed at the text midpoint and whose endpoints are modeled as dedicated drag handles. Supports inline
  editing, configurable text alignment, multiple arrows per text box, arrow deletion by dragging an endpoint back to
  text (with cursor-adjacent trash affordance), plus per-arrow `[X]` delete controls next to endpoint handles, and
  creating new arrows by clicking a selection-visible round handle (with plus icon) and placing each endpoint with a
  second click. If text exists, all arrows can be deleted (leader becomes plain text), and if both arrows and trimmed
  text become empty, the leader element removes itself. Rectangle marquee selection can match the element by arrow
  geometry, not only by the text box. Text input is normalized by trimming leading/trailing whitespace and trimming each
  line before empty/non-empty checks. Empty-text mode hides the text box/placeholder, keeps arrow starts at the exact
  anchor point, and shows a square anchor handle plus add-arrow and "T" edit handles.
- `ui/`: Shared shadcn/ui primitives and micro-components (for example keyboard shortcut hints).
- `verdant-scholar/`: Storybook-first design system draft modeled from the Stitch export for "The Living Archive". It
  contains scoped editorial tokens plus atom/molecule/organism components for all designed layouts and is intentionally
  not wired into the production app yet. The backlog of currently used but undesigned production components remains
  documented in `verdant-scholar/README.md`.
- Route-level reusable pieces such as navigation (Varjopinkka brand icon via Lucide), protected route wrapper, and
  management cards. This also includes `select-from-list-dialog.tsx`, a generic single-select dialog whose confirm
  action now supports async handlers and shows a pending state while long-running actions complete.
- Feature-specific UI for learning, tests, and Pinkka content workflows, including `species-card.tsx` for side-by-side
  learning media and info tabs with separated surfaces (floating desktop image area + distinct Verdant Scholar-style
  details card), including author-managed multilingual identification hint rendering and Pinkka textual detail rendering
  in the Pinkka tab without duplicate images, plus hint-linked carousel navigation from the identification tab,
  `species-form.tsx` for tabbed species editing (information, pictures, identification hints with optional stable image
  references), `image-grid-selector.tsx` for reusable single/multi image selection grids, and
  `species-identification-hint-dialog.tsx` for modal editing of individual hints (including framed preview +
  change/delete controls for referenced species images), and `species-image-carousel.tsx` for keyboard-driven image
  navigation/zoom (with learning view support up to 200% full-screen zoom and modal-state callbacks), plus
  `learning-session-shell.tsx` for shared learning session chrome with either the original top-header layout or a
  bottom-console layout variant, segmented species progress integration, and optional full-viewport Verdant Scholar
  atmospheric backgrounds.
