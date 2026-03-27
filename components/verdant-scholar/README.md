# Verdant Scholar

Scoped design tokens and a Storybook-first component library modeled from the Stitch export for "The Living Archive".

- `tokens.ts`: Editorial tokens for color, typography, spacing, gradients, radius, and tonal layering.
- `globals.css`: Global `:root` publication of the Verdant Scholar token set so app runtime and Storybook share the same
  CSS variable surface.
- `verdant-scholar-theme.tsx`: Wrapper that scopes the Verdant Scholar variables and loads Manrope + Inter from Google
  Fonts without changing the live app.
- `atoms/`: Base Radix/shadcn-backed primitives such as buttons, icon buttons, generic cards, shared text styles, choice
  chips, choice cards, progress bars, low-profile badges, and reusable animated atmosphere containers.
- `molecules/`: Specimen cards, feature tiles, taxonomy filters, popup menus, answer options, fact cards, section
  headings, and stack cards built from the shared atoms.
- `organisms/`: Full-screen and page-section compositions for every available Stitch layout.

## Usage

The application runtime publishes Verdant Scholar tokens from `app/layout.tsx`, while Storybook injects the same token
variables from `.storybook/preview.tsx`. Wrap isolated previews in `VerdantScholarTheme` and import components from
`@/components/verdant-scholar`.

## Intentional gaps

These production components are used by the current application but do not have explicit Stitch layouts yet, so they
were intentionally not reimplemented here:

- `LoadingSpinner`
- `ProtectedRoute`
- `ManageGroupCard`
- `ManageSpeciesCardHorizontalContent`
- `SelectFromListDialog`
- `DraggableHorizontalItem`
- `SpeciesForm`
- `PinkkaExplorer`
- `PinkkaImportProgressDialog`
- `ButtonConnector`
- `StackLearningHistogram`
