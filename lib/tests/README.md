# lib/tests

Helpers for test-session answer grading, session flow, and preference normalization.

- `scoring.ts`: Fuzzy string scoring helpers used for typed-answer checks.
- `test-session.ts`: Weighted question selection that favors less-learned species and delayed retry queue helpers for
  until-correct sessions.
- `test-preferences.ts`: Default/normalized test preferences with backward-compatible migration from legacy answer modes
  into independently selected answer scope (species/genus/family), answer name mode (scientific/vernacular/either), and
  session flow mode (fixed-round/until-correct).
