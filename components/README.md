# components

Reusable UI building blocks for app pages.

- `ui/`: Shared shadcn/ui primitives and micro-components (for example keyboard shortcut hints).
- Route-level reusable pieces such as navigation (Varjopinkka brand icon via Lucide), protected route wrapper, and
  management cards.
- Feature-specific UI for learning, tests, and Pinkka content workflows, including `species-card.tsx` for side-by-side
  learning media and info tabs (including Pinkka textual detail rendering in the Pinkka tab without duplicate images),
  and `species-image-carousel.tsx` for keyboard-driven image navigation/zoom (with learning view support up to 200%
  full-screen zoom and modal-state callbacks), plus `learning-session-shell.tsx` for shared learning headers with
  segmented species progress integration.
