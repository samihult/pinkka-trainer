# lib/tests

Helpers for test-session answer grading and preference normalization.

- `scoring.ts`: Fuzzy string scoring helpers used for typed-answer checks.
- `test-preferences.ts`: Default/normalized test preferences with backward-compatible migration from legacy answer modes
  into independently selected answer scope (species/genus/family) and answer name mode (scientific/vernacular/either).
