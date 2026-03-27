# app/learn/tests

Test flow routes for stack-based learning assessments.

- `[stackId]/page.tsx`: End-to-end test experience including settings, adaptive species sampling by familiarity, answer
  scoring across independently selected answer scopes (species/genus/family) and answer name modes
  (scientific/vernacular/either), strict taxonomy-aware multiple-choice distractor generation and correctness checks,
  exclusion of items that lack required genus/family taxonomy labels, learning progress writes for species/genus/family
  tracking, fixed-round and until-correct session flows with delayed retries for missed species, stack outcome histogram
  updates, multiple-choice 50/50 elimination support, Misty Marshland full-viewport atmospheric background rendering,
  and exit actions that return to the parent collection when available.
