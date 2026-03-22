/** Verdant Scholar home landing mirrors the home species learning Stitch layout. */
import type { ReactNode } from "react";

import { VerdantScholarButton } from "../atoms/button";
import { VerdantScholarInput } from "../atoms/input";
import { VerdantScholarSectionHeading } from "../molecules/section-heading";
import {
  VerdantScholarFeatureTile,
  type VerdantScholarFeatureTileProps,
} from "../molecules/feature-tile";
import { VerdantScholarFooter, type VerdantScholarFooterProps } from "./footer";
import {
  VerdantScholarTopNavigation,
  type VerdantScholarTopNavigationProps,
} from "./top-navigation";

/** Small editorial card metadata for the home landing collage. */
export interface VerdantScholarEditorialCard {
  description: string;
  icon: ReactNode;
  title: string;
}

/** Metric metadata for the home landing footer band. */
export interface VerdantScholarLandingMetric {
  label: string;
  value: string;
}

/** Hero content for the Verdant Scholar landing layout. */
export interface VerdantScholarLandingHero {
  description: string;
  floatingLabel: string;
  imageAlt: string;
  imageCaption: string;
  imageUrl: string;
  searchActionLabel: string;
  searchPlaceholder: string;
  title: ReactNode;
}

/**
 * Props for the Verdant Scholar home landing organism.
 * @property editorialCards Supporting editorial tiles beneath the feature grid.
 * @property featureTiles Featured taxonomy tiles.
 * @property footer Shared footer props.
 * @property hero Hero content block.
 * @property metrics Value strip shown above the footer.
 * @property navigation Shared navigation props.
 */
export interface VerdantScholarHomeLandingProps {
  editorialCards: VerdantScholarEditorialCard[];
  featureTiles: VerdantScholarFeatureTileProps[];
  footer: VerdantScholarFooterProps;
  hero: VerdantScholarLandingHero;
  metrics: VerdantScholarLandingMetric[];
  navigation: VerdantScholarTopNavigationProps;
}

/** Full landing page organism for the editorial archive home view. */
export function VerdantScholarHomeLanding({
  editorialCards,
  featureTiles,
  footer,
  hero,
  metrics,
  navigation,
}: VerdantScholarHomeLandingProps) {
  const [heroTile, ...supportingTiles] = featureTiles;

  return (
    <div className="space-y-16">
      <VerdantScholarTopNavigation {...navigation} />
      <main className="mx-auto w-full max-w-[var(--vs-layout-max-width)] space-y-20 px-6 pb-10 lg:px-8">
        <section className="grid gap-10 pt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.8fr)] lg:items-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="max-w-3xl text-[length:var(--vs-font-display-md)] leading-[0.92] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-extrabold tracking-tight">
                {hero.title}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--vs-color-on-surface-variant)]">
                {hero.description}
              </p>
            </div>
            <div className="max-w-2xl">
              <VerdantScholarInput
                actionLabel={hero.searchActionLabel}
                aria-label={hero.searchPlaceholder}
                placeholder={hero.searchPlaceholder}
              />
            </div>
          </div>
          <div className="relative">
            <div className="ml-auto max-w-md rotate-[3deg] overflow-hidden rounded-[var(--vs-radius-xl)] bg-[var(--vs-color-surface-container)] shadow-[var(--vs-shadow-floating)] transition-transform duration-700 hover:rotate-0">
              <img
                alt={hero.imageAlt}
                className="aspect-[4/5] w-full object-cover"
                src={hero.imageUrl}
              />
              <div className="p-6">
                <p className="text-sm text-[var(--vs-color-on-surface-variant)]">
                  {hero.imageCaption}
                </p>
              </div>
            </div>
            <div className="absolute -bottom-8 left-0 max-w-[10rem] -rotate-6 rounded-[var(--vs-radius-md)] bg-[var(--vs-color-tertiary-fixed)] p-5 shadow-[var(--vs-shadow-floating)]">
              <p className="text-sm leading-5 text-[var(--vs-color-on-tertiary-container)] [font-family:var(--vs-font-display-family)] font-bold">
                {hero.floatingLabel}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <VerdantScholarSectionHeading
            action={
              <VerdantScholarButton variant="ghost">
                View Complete Taxonomy
              </VerdantScholarButton>
            }
            description="Curated hero categories arranged with the asymmetry and tonal layering described in the Stitch export."
            eyebrow="Taxonomic Exploration"
            title="Featured Specimens"
          />
          <div className="grid gap-6 md:grid-cols-4 md:grid-rows-2">
            {heroTile ? (
              <VerdantScholarFeatureTile
                className="md:col-span-2 md:row-span-2"
                {...heroTile}
              />
            ) : null}
            {supportingTiles.map((tile, index) => (
              <VerdantScholarFeatureTile
                key={`${tile.title}-${index}`}
                className={index === 0 ? "md:col-span-2" : ""}
                {...tile}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-6">
            <p className="text-[length:var(--vs-font-label-md)] font-bold uppercase tracking-[0.18em] text-[var(--vs-color-primary)]">
              The Biological Editorial
            </p>
            <h2 className="max-w-xl text-[length:var(--vs-font-headline-md)] leading-tight text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
              Fostering a deeper connection with the biological world.
            </h2>
            <p className="max-w-xl text-[length:var(--vs-font-body-lg)] leading-7 text-[var(--vs-color-on-surface-variant)]">
              The Living Archive is a premium digital herbarium and zoological
              archive. The layout keeps scientific authority while feeling warm,
              editorial, and easy to scan.
            </p>
            <div className="flex flex-wrap gap-3">
              <VerdantScholarButton>
                Our Educational Mission
              </VerdantScholarButton>
              <VerdantScholarButton variant="secondary">
                Institutional Access
              </VerdantScholarButton>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {editorialCards.map((card) => (
              <article
                key={card.title}
                className="rounded-[var(--vs-radius-md)] bg-[var(--vs-color-surface-container-low)] p-6"
              >
                <div className="mb-8 text-[var(--vs-color-primary)]">
                  {card.icon}
                </div>
                <h3 className="text-[length:var(--vs-font-headline-sm)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight text-[var(--vs-color-on-surface)]">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--vs-color-on-surface-variant)]">
                  {card.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-y border-[color:rgba(194,201,180,0.18)] py-10 text-center sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <p className="text-4xl text-[var(--vs-color-primary)] [font-family:var(--vs-font-display-family)] font-extrabold tracking-tight">
                {metric.value}
              </p>
              <p className="mt-2 text-[length:var(--vs-font-label-md)] font-semibold uppercase tracking-[0.18em] text-[var(--vs-color-on-surface-variant)]">
                {metric.label}
              </p>
            </div>
          ))}
        </section>
      </main>
      <VerdantScholarFooter {...footer} />
    </div>
  );
}
