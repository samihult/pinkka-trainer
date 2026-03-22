# Verdant Scholar

Scoped design tokens and a Storybook-first component library modeled from the Stitch export for "The Living Archive".

- `tokens.ts`: Editorial tokens for color, typography, spacing, gradients, radius, and tonal layering.
- `verdant-scholar-theme.tsx`: Wrapper that scopes the Verdant Scholar variables and loads Manrope + Inter from Google
  Fonts without changing the live app.
- `atoms/`: Pill search input, gradient CTAs, icon buttons, progress bars, and low-profile badges.
- `molecules/`: Specimen cards, feature tiles, taxonomy filters, answer options, fact cards, section headings, and stack
  cards.
- `organisms/`: Full-screen and page-section compositions for every available Stitch layout.

## Usage

Wrap new prototypes in `VerdantScholarTheme` and import components from `@/components/verdant-scholar`.

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
