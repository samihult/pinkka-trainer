# AGENTS.md

Project conventions for Codex agents working in this repo.

## Stack and structure
- Next.js app router lives in `app/`; shared UI in `components/`; hooks in `hooks/`; shared logic in `lib/`.
- TypeScript + React 19; prefer `.ts`/`.tsx` for new files.
- Import alias `@/` points to repo root (see `tsconfig.json`).

## Styling
- Tailwind CSS v4 via `@import "tailwindcss"` in `app/globals.css`.
- Use design tokens from CSS variables (e.g. `--color-*`, `--radius-*`) and Tailwind utility classes.

## Client vs server
- Add `"use client"` at the top of components that use hooks, browser APIs, or context.
- App-level providers live in `app/layout.tsx` (AuthProvider, Toaster).

## Storybook
- Storybook config lives in `.storybook/`.
- Stories can live in `stories/` or alongside components as `*.stories.tsx`.

## Tooling
- Package manager: `pnpm` (see scripts in `package.json`).
- Lint via `pnpm lint`, tests via `pnpm test`, Storybook via `pnpm storybook`.
- Do not introduce or leave TypeScript errors unless explicitly permitted by the user.

## Documentation
- Add concise, helpful JSDoc comments for components, exported functions, and types.
- Document all fields in types and interfaces with JSDoc.
