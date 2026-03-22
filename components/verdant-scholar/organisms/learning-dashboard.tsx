/** Verdant Scholar learning dashboard mirrors the Stitch curator dashboard. */
import { Plus, Star } from "lucide-react";

import { VerdantScholarButton } from "../atoms/button";
import {
  VerdantScholarStackCard,
  type VerdantScholarStackCardProps,
} from "../molecules/stack-card";
import { VerdantScholarFooter, type VerdantScholarFooterProps } from "./footer";
import {
  VerdantScholarTopNavigation,
  type VerdantScholarTopNavigationProps,
} from "./top-navigation";

/** Summary metric metadata for the learning dashboard masthead. */
export interface VerdantScholarDashboardMetric {
  label: string;
  value: string;
}

/** Primary path card metadata for the learning dashboard. */
export interface VerdantScholarHighlightPath extends VerdantScholarStackCardProps {
  completionLabel: string;
  masteryLabel: string;
}

/**
 * Props for the Verdant Scholar learning dashboard.
 * @property collections Secondary collection cards.
 * @property footer Shared footer props.
 * @property highlight Featured study path card.
 * @property metrics Dashboard metrics.
 * @property navigation Shared navigation props.
 * @property sideCard Supporting side card.
 * @property toolkit Toolkit cards.
 * @property welcomeBody Welcome paragraph.
 * @property welcomeTitle Main headline.
 */
export interface VerdantScholarLearningDashboardProps {
  collections: VerdantScholarStackCardProps[];
  footer: VerdantScholarFooterProps;
  highlight: VerdantScholarHighlightPath;
  metrics: VerdantScholarDashboardMetric[];
  navigation: VerdantScholarTopNavigationProps;
  sideCard: VerdantScholarStackCardProps;
  toolkit: VerdantScholarStackCardProps[];
  welcomeBody: string;
  welcomeTitle: string;
}

/** Dashboard organism for study collections, progress, and researcher tools. */
export function VerdantScholarLearningDashboard({
  collections,
  footer,
  highlight,
  metrics,
  navigation,
  sideCard,
  toolkit,
  welcomeBody,
  welcomeTitle,
}: VerdantScholarLearningDashboardProps) {
  return (
    <div className="space-y-14">
      <VerdantScholarTopNavigation {...navigation} />
      <main className="mx-auto w-full max-w-[var(--vs-layout-max-width)] space-y-16 px-6 pb-10 lg:px-8">
        <section className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.34fr)]">
          <div className="space-y-4">
            <p className="text-[length:var(--vs-font-label-md)] font-bold uppercase tracking-[0.18em] text-[var(--vs-color-primary)]">
              Verdant Scholar Dashboard
            </p>
            <h1 className="text-[length:var(--vs-font-display-md)] leading-none text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-extrabold tracking-tight">
              {welcomeTitle}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--vs-color-on-surface-variant)]">
              {welcomeBody}
            </p>
          </div>
          <article className="rounded-[var(--vs-radius-xl)] bg-[var(--vs-color-surface-container-low)] p-6">
            <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
              {metrics.map((metric) => (
                <div key={metric.label}>
                  <p className="text-4xl text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-extrabold tracking-tight">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-[length:var(--vs-font-label-md)] font-bold uppercase tracking-[0.16em] text-[var(--vs-color-on-surface-variant)]">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="space-y-6">
          <h2 className="text-[length:var(--vs-font-headline-md)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
            Kingdom Plantae
          </h2>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.55fr)]">
            <article className="overflow-hidden rounded-[var(--vs-radius-xl)] bg-[var(--vs-color-surface-container-low)]">
              <div className="grid md:grid-cols-[minmax(240px,0.8fr)_minmax(0,1fr)]">
                {highlight.imageUrl ? (
                  <img
                    alt={highlight.imageAlt ?? highlight.title}
                    className="h-full w-full object-cover"
                    src={highlight.imageUrl}
                  />
                ) : null}
                <div className="space-y-5 p-6">
                  <p className="text-[length:var(--vs-font-label-sm)] font-bold uppercase tracking-[0.18em] text-[var(--vs-color-primary)]">
                    {highlight.eyebrow}
                  </p>
                  <h3 className="text-[length:var(--vs-font-headline-md)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
                    {highlight.title}
                  </h3>
                  <p className="text-sm leading-7 text-[var(--vs-color-on-surface-variant)]">
                    {highlight.description}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm text-[var(--vs-color-on-surface-variant)]">
                      <span>{highlight.masteryLabel}</span>
                      <span>{highlight.completionLabel}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[color:rgba(194,201,180,0.3)]">
                      <div className="h-full w-[75%] rounded-full bg-[var(--vs-color-primary)]" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <VerdantScholarButton>Start Study</VerdantScholarButton>
                    <VerdantScholarButton variant="secondary">
                      View Stack
                    </VerdantScholarButton>
                  </div>
                </div>
              </div>
            </article>
            <VerdantScholarStackCard {...sideCard} />
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-[length:var(--vs-font-headline-md)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
            Kingdom Animalia
          </h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {collections.map((card) => (
              <VerdantScholarStackCard key={card.title} {...card} />
            ))}
            <article className="flex min-h-[16rem] flex-col items-center justify-center rounded-[var(--vs-radius-md)] border border-dashed border-[color:rgba(194,201,180,0.45)] bg-[var(--vs-color-surface-container-lowest)] p-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-[var(--vs-color-surface-container-low)]">
                <Plus className="size-5 text-[var(--vs-color-on-surface-variant)]" />
              </div>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--vs-color-on-surface-variant)]">
                Import Catalog
              </p>
            </article>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[length:var(--vs-font-headline-md)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
              Researcher Toolset
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {toolkit.map((card) => (
              <VerdantScholarStackCard
                key={card.title}
                trailing={<Star className="size-4" />}
                {...card}
              />
            ))}
          </div>
        </section>
      </main>
      <VerdantScholarFooter {...footer} />
    </div>
  );
}
