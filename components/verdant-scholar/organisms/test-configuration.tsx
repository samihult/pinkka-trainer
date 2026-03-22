/** Verdant Scholar test configuration mirrors the Stitch specimen identification setup screen. */
import { CheckCircle2, Circle, Filter, Globe2, Lightbulb } from "lucide-react";

import { VerdantScholarButton } from "../atoms/button";
import { VerdantScholarFooter, type VerdantScholarFooterProps } from "./footer";
import {
  VerdantScholarTopNavigation,
  type VerdantScholarTopNavigationProps,
} from "./top-navigation";

/** Choice metadata for segmented option groups. */
export interface VerdantScholarConfigurationChoice {
  description?: string;
  selected?: boolean;
  title: string;
}

/**
 * Props for the Verdant Scholar test configuration organism.
 * @property collectionSizes Collection size choices.
 * @property footer Shared footer props.
 * @property methodologies Methodology options.
 * @property navigation Shared navigation props.
 * @property nomenclatureOptions Nomenclature option tiles.
 */
export interface VerdantScholarTestConfigurationProps {
  collectionSizes: VerdantScholarConfigurationChoice[];
  footer: VerdantScholarFooterProps;
  methodologies: VerdantScholarConfigurationChoice[];
  navigation: VerdantScholarTopNavigationProps;
  nomenclatureOptions: VerdantScholarConfigurationChoice[];
}

/** Test setup page with collection size, methodology, and nomenclature options. */
export function VerdantScholarTestConfiguration({
  collectionSizes,
  footer,
  methodologies,
  navigation,
  nomenclatureOptions,
}: VerdantScholarTestConfigurationProps) {
  return (
    <div className="space-y-12">
      <VerdantScholarTopNavigation {...navigation} />
      <main className="mx-auto w-full max-w-[var(--vs-layout-max-width)] px-6 pb-10 lg:px-8">
        <section className="mx-auto max-w-3xl space-y-8 pt-8">
          <div className="space-y-4">
            <p className="text-[length:var(--vs-font-label-md)] font-bold uppercase tracking-[0.18em] text-[var(--vs-color-primary)]">
              Examination Module 042
            </p>
            <h1 className="text-[length:var(--vs-font-display-md)] leading-none text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-extrabold tracking-tight">
              Specimen Identification Configuration
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--vs-color-on-surface-variant)]">
              Select your parameters to begin the archival validation process.
              All tests contribute to your taxonomy progress.
            </p>
          </div>

          <article className="rounded-[var(--vs-radius-xl)] bg-[var(--vs-color-surface-container-low)] p-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-[var(--vs-color-primary)]" />
                <h2 className="text-[length:var(--vs-font-headline-sm)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
                  Collection Size
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {collectionSizes.map((choice) => (
                  <div
                    key={choice.title}
                    className={
                      choice.selected
                        ? "rounded-[var(--vs-radius-sm)] bg-[var(--vs-color-primary-container)] px-4 py-4 text-center text-sm font-semibold text-[var(--vs-color-on-primary-container)]"
                        : "rounded-[var(--vs-radius-sm)] bg-[var(--vs-color-surface-container)] px-4 py-4 text-center text-sm font-semibold text-[var(--vs-color-on-surface)]"
                    }
                  >
                    {choice.title}
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 space-y-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-[var(--vs-color-primary)]" />
                <h2 className="text-[length:var(--vs-font-headline-sm)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
                  Methodology
                </h2>
              </div>
              <div className="space-y-3">
                {methodologies.map((choice) => (
                  <article
                    key={choice.title}
                    className="rounded-[var(--vs-radius-sm)] bg-[var(--vs-color-surface-container)] px-5 py-4"
                  >
                    <div className="flex items-start gap-3">
                      {choice.selected ? (
                        <CheckCircle2 className="mt-0.5 size-4 text-[var(--vs-color-primary)]" />
                      ) : (
                        <Circle className="mt-0.5 size-4 text-[var(--vs-color-on-surface-variant)]" />
                      )}
                      <div>
                        <p className="font-semibold text-[var(--vs-color-on-surface)]">
                          {choice.title}
                        </p>
                        {choice.description ? (
                          <p className="mt-1 text-sm text-[var(--vs-color-on-surface-variant)]">
                            {choice.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-8 space-y-4">
              <div className="flex items-center gap-2">
                <Globe2 className="size-4 text-[var(--vs-color-primary)]" />
                <h2 className="text-[length:var(--vs-font-headline-sm)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
                  Nomenclature
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {nomenclatureOptions.map((choice) => (
                  <article
                    key={choice.title}
                    className="rounded-[var(--vs-radius-sm)] bg-[var(--vs-color-surface-container)] px-5 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--vs-color-on-surface)]">
                          {choice.title}
                        </p>
                        {choice.description ? (
                          <p className="mt-1 text-sm text-[var(--vs-color-on-surface-variant)]">
                            {choice.description}
                          </p>
                        ) : null}
                      </div>
                      {choice.selected ? (
                        <CheckCircle2 className="size-4 text-[var(--vs-color-primary)]" />
                      ) : (
                        <Circle className="size-4 text-[var(--vs-color-on-surface-variant)]" />
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <div className="mt-8 space-y-4">
              <VerdantScholarButton
                className="w-full justify-center"
                size="lg"
                trailingIcon={<span aria-hidden>▶</span>}
              >
                Start Test
              </VerdantScholarButton>
              <p className="text-center text-[length:var(--vs-font-label-md)] uppercase tracking-[0.18em] text-[var(--vs-color-on-surface-variant)]">
                Average duration: 4-8 minutes
              </p>
            </div>
          </article>
        </section>
      </main>
      <VerdantScholarFooter {...footer} />
    </div>
  );
}
