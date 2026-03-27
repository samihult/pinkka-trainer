# components/tests

Reusable UI building blocks for the testing experience.

- `test-settings-card.tsx`: Live test setup surface composed from Verdant Scholar atoms, with independently selectable
  answer scope (species/genus/family), answer name mode (scientific/vernacular/either), and question-count controls.
- `learning-status-card.tsx`: Per-question retention feedback.
- `test-species-card.tsx`: Test prompt image panel with per-species familiarity indication for the active test settings.
- `test-completed-card.tsx`: Final test summary, stack learning histogram display, and post-test navigation back to the
  relevant collection or browse fallback.
