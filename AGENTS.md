# AGENTS.md

Project conventions for Codex agents working in this repo.

## Stack and structure

- Next.js app router lives in `app/`; shared UI in `components/`; hooks in `hooks/`; shared logic in `lib/`.
- TypeScript + React 19; prefer `.ts`/`.tsx` for new files.
- Import alias `@/` points to repo root (see `tsconfig.json`).

### External libraries

- Prefer non-sticky licenses, such as MIT
- Sticky licenses are subject to manual approval
- Commercial licenses are not allowed
- Only use open-source libraries
- If available, pick active, popular libraries
- Avoid libraries that have lots of forks
- Never use abandoned libraries

## General quality constraints

- Keep changes minimal and localized to the requested feature
- Always, after making changes into React code, make the following checks and fix the potential issues:
  - External **always** requests are run as batch calls, if possible, to maintain good performance
  - There are no state or effect loops
- Always, after making changes to any code, make the following checks and fix the potential issues:
  - Files, functions, etc. should be compact, if possible, and split so that the logic is easy to read
  - Directory structure and file naming is logical, so that it is easy to understand what can be found and where
  - If blocks or loops and compact, and larger functionalities are extracted into functions or components
  - Documentation is up-to-date and improved in the process, as described in this document
- Database structures must be sound:
  - Relational databases:
    - Foreign keys with cascading must be used where the tables form an atomic structure
    - Foreign keys must not be used where the entities may not be atomic, e.g. because of asynchronicity
  - Proper indexes must be kept for performance, but their number must be kept minimal
- Internationalization:
  - All strings have translations
  - Dates, numbers, percentages etc. follow the locale conventions

After finishing a task, state briefly the state of these aspects on the top-level, and if they have been made fixes to.
This is non-negotiable.

## Code formatting (must follow repo settings)

## Prettier is authoritative

- Always use the repo’s local Prettier
- After modifying JS/TS/MD/JSON/CSS files:
  - Run `pnpm format`
- Before finishing:
  - Run `pnpm format:check`
- If formatting differs, apply Prettier output
- Never manually fight Prettier formatting

## UI code style

- **Clarity over cleverness**: UI should be immediately understandable.
- **Consistency over novelty**: reuse existing components/patterns.
- **Density with breathing room**: compact, but never cramped.
- **Accessible by default**: keyboard + screen reader + contrast.

- Modals must not grow larger than the screen, and if the content is larger, they must be made scrollable.
- Primary action on the right (unless platform conventions differ).
- Escape closes modal; focus trap enabled; initial focus sensible.

- Reuse existing components/styles before creating new ones.
- Prioritize shadcn/ui component patterns
- Create separate subcomponents when adding dialogs, modals, or repeated elements such as cards, forms or list items.
- Always try to find a ready-made component (library) instead of building a new one.
- Refactor touched components into smaller, if they grow very large, their state gets complex, or there are lots of
  conditionals.

### Styling

- Tailwind CSS v4 via `@import "tailwindcss"` in `app/globals.css`.
- Use design tokens from CSS variables (e.g. `--color-*`, `--radius-*`) and Tailwind utility classes.

### Client vs server

- Add `"use client"` at the top of components that use hooks, browser APIs, or context.
- App-level providers live in `app/layout.tsx` (AuthProvider, Toaster).

### Storybook

- Storybook config lives in `.storybook/`.
- Stories can live in `stories/` or alongside components as `*.stories.tsx`.

## Tooling

- Package manager: `pnpm` (see scripts in `package.json`).
- Lint via `pnpm lint`, tests via `pnpm test`, Storybook via `pnpm storybook`.
- Do not introduce or leave TypeScript errors unless explicitly permitted by the user.
- When asked to run TypeScript, use `pnpm -s tsc --noEmit` and provide a brief plan to fix any reported errors.

## Documentation

To help future developers and agents to understand the code better and speed up their work, make the following
improvements when touching the codebase:

- Add or update README.md files to each directory that summarizes what the directory contains
- Add or update file-level comments that summarize what the file contains
- Add or update block comments to code where design decisions are made
- Add or update concise, helpful JSDoc comments for components, exported functions, and types
- Document all fields in types and interfaces with JSDoc
