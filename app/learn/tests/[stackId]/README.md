# app/learn/tests/[stackId]

Dynamic test route for one stack.

- `page.tsx`: Client-side test flow with configurable question count, test mode, answer scope (species/genus/family),
  answer name mode (scientific/vernacular/either), and session flow mode (fixed-round/until-correct); genus/family
  prompts read values from Pinkka taxonomy only, skip species that lack required taxonomy data, render multiple-choice
  answers as Verdant Scholar answer rows using the actively tested label only, prefer less-learned species in weighted
  selection, requeue missed until-correct questions later in the session, and handle scoring + learning-progress writes
  with legacy fallback reads.
