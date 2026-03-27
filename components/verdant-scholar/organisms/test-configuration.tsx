/** Verdant Scholar test configuration mirrors the Stitch specimen identification setup screen. */
import { CheckCircle2, Circle, Filter, Globe2, Lightbulb } from "lucide-react";

import { VerdantScholarButton } from "../atoms/button";
import { VerdantScholarCard, VerdantScholarCardContent } from "../atoms/card";
import { VerdantScholarChoiceCard } from "../atoms/choice-card";
import { VerdantScholarChoiceChip } from "../atoms/choice-chip";
import { VerdantScholarHeading, VerdantScholarText } from "../atoms/text";
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
            <VerdantScholarText tone="primary" variant="label">
              Examination Module 042
            </VerdantScholarText>
            <VerdantScholarHeading asChild variant="display">
              <h1>Specimen Identification Configuration</h1>
            </VerdantScholarHeading>
            <VerdantScholarText
              className="max-w-2xl"
              tone="muted"
              variant="body-lg"
            >
              Select your parameters to begin the archival validation process.
              All tests contribute to your taxonomy progress.
            </VerdantScholarText>
          </div>

          <VerdantScholarCard tone="surface">
            <VerdantScholarCardContent className="space-y-8 pt-8">
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Filter className="size-4 text-[var(--vs-color-primary)]" />
                  <VerdantScholarHeading asChild variant="subheadline">
                    <h2>Collection Size</h2>
                  </VerdantScholarHeading>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {collectionSizes.map((choice) => (
                    <VerdantScholarChoiceChip
                      key={choice.title}
                      className="h-auto justify-center px-4 py-4 text-center"
                      selected={choice.selected}
                    >
                      {choice.title}
                    </VerdantScholarChoiceChip>
                  ))}
                </div>
              </section>

              <section className="mt-8 space-y-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-4 text-[var(--vs-color-primary)]" />
                  <VerdantScholarHeading asChild variant="subheadline">
                    <h2>Methodology</h2>
                  </VerdantScholarHeading>
                </div>
                <div className="space-y-3">
                  {methodologies.map((choice) => (
                    <VerdantScholarChoiceCard
                      className="px-5 py-4"
                      description={choice.description}
                      key={choice.title}
                      leading={
                        choice.selected ? (
                          <CheckCircle2 className="mt-0.5 size-4 text-[var(--vs-color-primary)]" />
                        ) : (
                          <Circle className="mt-0.5 size-4 text-[var(--vs-color-on-surface-variant)]" />
                        )
                      }
                      selected={choice.selected}
                      title={choice.title}
                    />
                  ))}
                </div>
              </section>

              <section className="mt-8 space-y-4">
                <div className="flex items-center gap-2">
                  <Globe2 className="size-4 text-[var(--vs-color-primary)]" />
                  <VerdantScholarHeading asChild variant="subheadline">
                    <h2>Nomenclature</h2>
                  </VerdantScholarHeading>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {nomenclatureOptions.map((choice) => (
                    <VerdantScholarChoiceCard
                      className="px-5 py-4"
                      description={choice.description}
                      key={choice.title}
                      selected={choice.selected}
                      title={choice.title}
                      trailing={
                        choice.selected ? (
                          <CheckCircle2 className="size-4 text-[var(--vs-color-primary)]" />
                        ) : (
                          <Circle className="size-4 text-[var(--vs-color-on-surface-variant)]" />
                        )
                      }
                    />
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
                <VerdantScholarText
                  asChild
                  className="text-center"
                  tone="muted"
                  variant="label"
                >
                  <p>Average duration: 4-8 minutes</p>
                </VerdantScholarText>
              </div>
            </VerdantScholarCardContent>
          </VerdantScholarCard>
        </section>
      </main>
      <VerdantScholarFooter {...footer} />
    </div>
  );
}
