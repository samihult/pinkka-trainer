# app/learn/tests

Test flow routes for stack-based learning assessments.

- `[stackId]/page.tsx`: End-to-end test experience including settings, adaptive species sampling by familiarity, answer
  scoring across species/genus/family answer scopes, scope-aware multiple-choice distractor generation and correctness
  checks, learning progress writes for species/genus/family tracking, stack outcome histogram updates, multiple-choice
  50/50 elimination support, Misty Marshland full-viewport atmospheric background rendering, and exit actions that
  return to the parent collection when available.
