# Design System Document: The Biological Editorial

## 1. Overview & Creative North Star

**Creative North Star: "The Living Archive"**

This design system moves away from the sterile, database-heavy aesthetic of traditional biological tools and toward a
high-end editorial experience. We treat species data not as "rows in a table," but as "specimens in a gallery."

To break the "template" look, we utilize **Intentional Asymmetry**. This means hero sections may have off-center
typography, and image grids should use varying aspect ratios to mimic the organic unpredictability of nature. By
layering semi-transparent surfaces and utilizing exaggerated typographic scales, we create a digital environment that
feels as authoritative as a hardback encyclopedia but as fluid as a modern laboratory interface.

---

## 2. Colors: Tonal Depth & Organic Vitality

Our palette is rooted in the "Chlorophyll Green" (`primary: #3f6a00`) and "Silica Grey" (`surface: #fcf9f8`). We use
these to create a hierarchy of focus.

### The "No-Line" Rule

**Strict Mandate:** 1px solid borders are prohibited for sectioning. Structure must be defined through background
shifts. To separate a sidebar from a main content area, place a `surface-container-low` section against a `surface`
background. The human eye perceives the transition of tone more naturally than a harsh stroke.

### Surface Hierarchy & Nesting

Treat the UI as physical layers of fine vellum paper.

- **Base:** `surface` (#fcf9f8)
- **Level 1 (Sections):** `surface-container-low` (#f6f3f2)
- **Level 2 (Cards/Modules):** `surface-container` (#f0eded)
- **Level 3 (Floating/Active):** `surface-container-highest` (#e5e2e1)

### The "Glass & Gradient" Rule

To add "soul" to biological data:

- **Glassmorphism:** Use `surface_variant` at 60% opacity with a `24px` backdrop-blur for floating navigation or
  hovering "Quick Info" panels.
- **Signature Gradients:** For primary CTAs or high-level category headers, use a subtle linear gradient from `primary`
  (#3f6a00) to `primary_container` (#8cc24d) at a 135-degree angle. This mimics the light hitting a leaf’s surface.

---

## 3. Typography: The Editorial Voice

We utilize a high-contrast pairing: **Manrope** for structural authority and **Inter** for data density.

- **Display (Manrope):** Use `display-lg` (3.5rem) for species names. The wide stance of Manrope feels modern and
  established.
- **Headlines (Manrope):** `headline-md` (1.75rem) should be used for section titles (e.g., "Habitat," "Morphology").
- **Body & Titles (Inter):** Inter provides maximum legibility for scientific descriptions. Use `body-lg` (1rem) for
  general descriptions to ensure long-form reading comfort.
- **Labels (Inter):** Use `label-md` (0.75rem) for Latin nomenclature, always in uppercase with `0.05em` letter spacing
  to denote scientific precision.

---

## 4. Elevation & Depth

We eschew the "drop shadow" in favor of **Tonal Layering**.

- **The Layering Principle:** A card containing a specimen image should be `surface-container-lowest` (#ffffff) sitting
  on a `surface-container-low` (#f6f3f2) background. This creates a "soft lift."
- **Ambient Shadows:** If a floating element (like a Compare Tool) is required, use a shadow with a `48px` blur, `0px`
  spread, and `4%` opacity. The shadow color must be a tinted version of `on-surface` (#1c1b1b), never pure black.
- **The Ghost Border Fallback:** For high-density data tables where boundaries are essential, use a "Ghost Border":
  `outline-variant` (#c2c9b4) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons

- **Primary:** Gradient of `primary` to `primary_container`. `xl` roundedness (1.5rem). No shadow; use a `2px` hover
  expansion.
- **Secondary:** `surface-container-highest` background with `on-surface` text.
- **Tertiary:** Ghost style. `on-surface` text with an underline that appears only on hover.

### Cards (Specimen Cards)

- **Rules:** No borders. Use `surface-container-low`.
- **Content:** Images should have a `md` (0.75rem) border radius. Use vertical white space (`spacing-8`) to separate the
  image from the species title rather than a divider line.

### Input Fields

- **Search:** Use `surface-container-highest` with a `full` (9999px) pill shape. Text should be `body-md`.
- **Focus State:** Shift background to `surface-container-lowest` and add a `2px` "Ghost Border" of `primary` at 40%
  opacity.

### Species Chips

- **Style:** Low-profile. Use `secondary_container` for the background and `on_secondary_container` for text. `sm`
  (0.25rem) roundedness for a more "taxonomic tag" feel.

### Taxonomic Lists

- **Rule:** Forbid divider lines. Use `spacing-4` between items.
- **Interactive State:** On hover, the background of the list item shifts to `surface-container-high`.

---

## 6. Do's and Don'ts

### Do:

- **Embrace Negative Space:** Use `spacing-12` or `spacing-16` between major sections to let the "specimens" breathe.
- **Use Asymmetric Grids:** Align text to the left but allow images to "break the container" on the right for a premium
  editorial feel.
- **Color-Code Subtly:** Use `tertiary` (yellow-gold tones) only for high-priority alerts or "Endangered" status
  indicators.

### Don't:

- **Don't use 1px Dividers:** They clutter the scientific data. Use tonal shifts or white space instead.
- **Don't use pure black (#000):** Use `on_surface` (#1c1b1b) to maintain a sophisticated, soft-contrast look.
- **Don't crowd the margins:** Biological data is complex; the UI shouldn't be. Keep a minimum of `spacing-8` (2rem) as
  a global outer margin.
