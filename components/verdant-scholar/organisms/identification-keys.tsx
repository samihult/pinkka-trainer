/** Verdant Scholar identification keys mirror the Stitch identification learning layout. */
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, Microscope, Sprout } from "lucide-react";

import { VerdantScholarButton } from "../atoms/button";
import { VerdantScholarFactCard } from "../molecules/fact-card";
import {
  VerdantScholarFeatureTile,
  type VerdantScholarFeatureTileProps,
} from "../molecules/feature-tile";
import { VerdantScholarSectionHeading } from "../molecules/section-heading";
import { VerdantScholarFooter, type VerdantScholarFooterProps } from "./footer";
import {
  VerdantScholarTopNavigation,
  type VerdantScholarTopNavigationProps,
} from "./top-navigation";

/** Identification step metadata for the active path panel. */
export interface VerdantScholarIdentificationStep {
  actions?: string[];
  active?: boolean;
  indexLabel: string;
  subtitle: string;
  title: string;
}

/** Saved specimen metadata for the identification keys sidebar. */
export interface VerdantScholarSavedSpecimen {
  imageAlt: string;
  imageUrl: string;
  subtitle: string;
  title: string;
}

/** Small methodology or directory card metadata. */
export interface VerdantScholarDirectoryCard {
  description: string;
  icon: ReactNode;
  title: string;
}

/**
 * Props for the Verdant Scholar identification keys organism.
 * @property directoryCards Research directory cards.
 * @property featuredModule Large featured learning module.
 * @property footer Shared footer props.
 * @property guideDescription Sidebar methodology copy.
 * @property heroDescription Hero paragraph.
 * @property moduleCards Supporting learning modules.
 * @property navigation Shared navigation props.
 * @property savedSpecimens Saved specimen sidebar rows.
 * @property steps Active dichotomous path steps.
 */
export interface VerdantScholarIdentificationKeysProps {
  directoryCards: VerdantScholarDirectoryCard[];
  featuredModule: VerdantScholarFeatureTileProps;
  footer: VerdantScholarFooterProps;
  guideDescription: string;
  heroDescription: string;
  moduleCards: VerdantScholarDirectoryCard[];
  navigation: VerdantScholarTopNavigationProps;
  savedSpecimens: VerdantScholarSavedSpecimen[];
  steps: VerdantScholarIdentificationStep[];
}

/** Identification learning page with dichotomous path, saved specimens, and modules. */
export function VerdantScholarIdentificationKeys({
  directoryCards,
  featuredModule,
  footer,
  guideDescription,
  heroDescription,
  moduleCards,
  navigation,
  savedSpecimens,
  steps,
}: VerdantScholarIdentificationKeysProps) {
  return (
    <div className="space-y-14">
      <VerdantScholarTopNavigation {...navigation} />
      <main className="mx-auto w-full max-w-[var(--vs-layout-max-width)] space-y-16 px-6 pb-10 lg:px-8">
        <section className="flex flex-col gap-6 pt-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="text-[length:var(--vs-font-label-md)] font-bold uppercase tracking-[0.18em] text-[var(--vs-color-primary)]">
              Scientific Resources / Methodology
            </p>
            <h1 className="text-[length:var(--vs-font-display-md)] leading-none text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-extrabold tracking-tight">
              Identification Keys.
            </h1>
            <p className="text-lg leading-8 text-[var(--vs-color-on-surface-variant)]">
              {heroDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <VerdantScholarButton>Start Matrix Key</VerdantScholarButton>
            <VerdantScholarButton variant="secondary">
              Documentation
            </VerdantScholarButton>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <article className="relative overflow-hidden rounded-[var(--vs-radius-xl)] bg-[var(--vs-color-surface-container-low)] p-8">
            <div className="relative z-10 space-y-8">
              <h2 className="text-[length:var(--vs-font-headline-md)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
                Active Dichotomous Path
              </h2>
              <div className="space-y-10">
                {steps.map((step, index) => (
                  <div key={step.indexLabel} className="flex gap-6">
                    <div className="flex flex-col items-center">
                      <div
                        className={
                          step.active
                            ? "flex size-10 items-center justify-center rounded-full bg-[var(--vs-color-primary)] text-[var(--vs-color-on-primary)] text-sm font-bold"
                            : "flex size-10 items-center justify-center rounded-full bg-[var(--vs-color-surface-container-highest)] text-[var(--vs-color-on-surface-variant)] text-sm font-bold"
                        }
                      >
                        {step.indexLabel}
                      </div>
                      {index < steps.length - 1 ? (
                        <div className="mt-3 h-full w-px bg-[color:rgba(194,201,180,0.28)]" />
                      ) : null}
                    </div>
                    <div className={step.active ? "" : "opacity-45"}>
                      <p className="text-[length:var(--vs-font-label-md)] font-bold uppercase tracking-[0.18em] text-[var(--vs-color-on-surface-variant)]">
                        {step.subtitle}
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold leading-tight text-[var(--vs-color-on-surface)]">
                        {step.title}
                      </h3>
                      {step.actions?.length ? (
                        <div className="mt-5 flex flex-wrap gap-3">
                          {step.actions.map((action) => (
                            <VerdantScholarButton
                              key={action}
                              variant="secondary"
                            >
                              {action}
                            </VerdantScholarButton>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-20 -right-20 size-72 rounded-full bg-[color:rgba(63,106,0,0.06)] blur-3xl" />
          </article>

          <div className="space-y-6">
            <VerdantScholarFactCard
              icon={
                <BookOpen className="size-5 text-[var(--vs-color-primary)]" />
              }
              summary={guideDescription}
              title="Methodology Guide"
              tone="soft"
            />
            <article className="rounded-[var(--vs-radius-xl)] bg-[var(--vs-color-surface-container)] p-6">
              <h3 className="text-[length:var(--vs-font-headline-sm)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
                Saved Specimens
              </h3>
              <div className="mt-5 space-y-4">
                {savedSpecimens.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center gap-4 rounded-[var(--vs-radius-sm)] bg-[var(--vs-color-surface-container-lowest)] p-3"
                  >
                    <img
                      alt={item.imageAlt}
                      className="size-12 rounded-[var(--vs-radius-xs)] object-cover"
                      src={item.imageUrl}
                    />
                    <div>
                      <p className="text-[length:var(--vs-font-label-sm)] font-bold uppercase tracking-[0.16em] text-[var(--vs-color-primary)]">
                        {item.title}
                      </p>
                      <p className="text-sm text-[var(--vs-color-on-surface-variant)]">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="space-y-8">
          <VerdantScholarSectionHeading
            action={
              <VerdantScholarButton variant="ghost">
                View Archive
              </VerdantScholarButton>
            }
            title="Curated Learning Modules."
          />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <VerdantScholarFeatureTile {...featuredModule} emphasis="hero" />
            <div className="grid gap-4 sm:grid-cols-2">
              {moduleCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-[var(--vs-radius-md)] bg-[var(--vs-color-surface-container-low)] p-6"
                >
                  <div className="mb-8 text-[var(--vs-color-primary)]">
                    {card.icon}
                  </div>
                  <h3 className="text-[length:var(--vs-font-headline-sm)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--vs-color-on-surface-variant)]">
                    {card.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[var(--vs-radius-xl)] bg-[var(--vs-color-inverse-surface)] p-8 text-[var(--vs-color-inverse-on-surface)]">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <div className="space-y-5">
              <h2 className="text-[length:var(--vs-font-headline-md)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
                Researcher Directory.
              </h2>
              <p className="max-w-lg text-sm leading-7 text-white/72">
                Access peer-reviewed datasets, high-resolution specimen scans,
                and collaborative tools for verified institutional work.
              </p>
              <div className="space-y-4">
                {directoryCards.map((card) => (
                  <div
                    key={card.title}
                    className="flex items-center justify-between gap-4 border-b border-white/10 pb-4"
                  >
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/85">
                        {card.title}
                      </h3>
                      <p className="mt-2 text-sm text-white/65">
                        {card.description}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-[var(--vs-color-primary-fixed)]" />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <article className="rounded-[var(--vs-radius-md)] bg-[color:rgba(255,255,255,0.08)] p-6">
                <Microscope className="size-6 text-[var(--vs-color-primary-fixed)]" />
                <p className="mt-12 text-lg [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
                  Institutional Access Portal
                </p>
              </article>
              <article className="rounded-[var(--vs-radius-md)] bg-[color:rgba(255,255,255,0.08)] p-6">
                <Sprout className="size-6 text-[var(--vs-color-primary-fixed)]" />
                <p className="mt-12 text-lg [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
                  Ecological Media Bank
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>
      <VerdantScholarFooter {...footer} />
    </div>
  );
}
