# UI Style Guide (UI Constraints Contract)

This document defines **non-negotiable UI constraints** for changes produced by agents (Codex, CI bots, contributors).
If a requested change conflicts with this guide, the agent must:

1. explain the conflict,
2. propose the closest compliant alternative,
3. avoid introducing visual regressions.

## Priority Order

1. Product requirements in the ticket/PR description (if explicit and UI-related)
2. This UI Style Guide
3. Existing patterns already used in the codebase (match the nearest existing component)

If (1) conflicts with (2), escalate in the PR notes and implement the most minimal change possible.

---

## Design Principles

- **Clarity over cleverness**: UI should be immediately understandable.
- **Consistency over novelty**: reuse existing components/patterns.
- **Density with breathing room**: compact, but never cramped.
- **Accessible by default**: keyboard + screen reader + contrast.

---

## Components & Interaction Patterns

### Buttons

- Primary: one per view/section where possible.
- Secondary: neutral outline/ghost.
- Destructive: reserved for irreversible actions; confirm where appropriate.
- Always show a loading state for async actions.

### Forms

- Labels are always visible (don’t rely on placeholder-only).
- Inline validation near the field; avoid interrupting modals unless critical.
- Required fields clearly indicated.
- Use helper text for constraints (e.g., "Max 50 characters").

### Tables / Lists

- Column alignment consistent; numeric aligned at decimal separator with fallback to right alignment.
- Empty states must explain:
    1) what this area is,
    2) why it’s empty,
    3) what to do next.

### Modals / Dialogs

- Use modals for focused tasks; avoid long scrolling modals.
- Modals must not grow larger than the screen, and if the content is larger, they must be made scrollable.
- Primary action on the right (unless platform conventions differ).
- Escape closes modal; focus trap enabled; initial focus sensible.

### Navigation

- Keep nav labels short and consistent.
- Highlight current route clearly.
- Avoid adding new top-level nav items unless required.

---

## Content & micro-copy

- Use concise, friendly language.
- Prefer verbs for actions (“Create”, “Save”, “Send”).
- Avoid marketing-oriented voice and unfounded superlatives.
- Avoid jargon and internal code names in user-facing UI.
- Error copy should say what happened + what to do next.

---

## Implementation Constraints for Agents

Agents must:

- Reuse existing components/styles before creating new ones.
- Prioritize shadcn/ui component patterns
- Avoid creating components with very many variants or very large amount of props.
- Keep changes minimal and localized to the requested feature.
- Create separate subcomponents when adding dialogs, modals, or repeated elements such as cards, forms or list items.
- Always try to find a ready-made component (library) instead of building a new one.
- Refactor touched components into smaller, if they grow very large, their state gets complex, or there are lots of
  conditionals.

If the agent must add a new component:

- Put it in the existing component structure,
- add basic states (hover/focus/disabled/loading),
- include accessibility attributes,
- match spacing/typography rules above.

---

## Quick “Do / Don’t”

### Do

- Match existing UI patterns and spacing.
- Add empty/error/loading states.
- Ensure focus and keyboard behavior works.
- Keep forms readable and labels visible.
- Design UI that avoids disabled button states.

### Don’t

- Introduce new fonts, random colors, or ad-hoc spacing.
- Add multiple competing primary buttons.
- Hide critical actions behind ambiguous icons.
- Use placeholder-only labels.
- Create visually noisy screens (too many borders/shadows).
