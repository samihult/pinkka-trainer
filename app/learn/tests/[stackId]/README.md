# app/learn/tests/[stackId]

Dynamic test route for one stack.

- `page.tsx`: Client-side test flow with configurable question count, test mode, answer scope (species/genus/family),
  and answer name mode (scientific/vernacular/either); genus/family prompts read values from Pinkka taxonomy only, skip
  species that lack required taxonomy data, render multiple-choice answers as Verdant Scholar answer rows using the
  actively tested label only, and handle scoring + learning-progress writes with legacy fallback reads.
