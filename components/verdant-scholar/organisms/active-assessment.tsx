/** Verdant Scholar active assessment mirrors the Stitch testing screen. */
import { Bookmark, Lightbulb } from "lucide-react";

import { VerdantScholarButton } from "../atoms/button";
import { VerdantScholarIconButton } from "../atoms/icon-button";
import { VerdantScholarProgressBar } from "../atoms/progress-bar";
import {
  VerdantScholarAnswerOption,
  type VerdantScholarAnswerOptionProps,
} from "../molecules/answer-option";
import { VerdantScholarFactCard } from "../molecules/fact-card";
import { VerdantScholarFooter, type VerdantScholarFooterProps } from "./footer";
import {
  VerdantScholarTopNavigation,
  type VerdantScholarTopNavigationProps,
} from "./top-navigation";

/**
 * Props for the Verdant Scholar active assessment organism.
 * @property answers Multiple-choice answers.
 * @property footer Shared footer props.
 * @property imageAlt Accessible specimen image description.
 * @property imageUrl Assessment specimen image.
 * @property insight Supporting taxonomic insight text.
 * @property navigation Shared navigation props.
 * @property observationBody Observation card body text.
 * @property progress Percentage progress.
 * @property question Prompt text.
 * @property questionCountLabel Secondary question count label.
 * @property title Assessment title.
 */
export interface VerdantScholarActiveAssessmentProps {
  answers: VerdantScholarAnswerOptionProps[];
  footer: VerdantScholarFooterProps;
  imageAlt: string;
  imageUrl: string;
  insight: string;
  navigation: VerdantScholarTopNavigationProps;
  observationBody: string;
  progress: number;
  question: string;
  questionCountLabel: string;
  title: string;
}

/** Active assessment view with image prompt, answer states, observation note, and next CTA. */
export function VerdantScholarActiveAssessment({
  answers,
  footer,
  imageAlt,
  imageUrl,
  insight,
  navigation,
  observationBody,
  progress,
  question,
  questionCountLabel,
  title,
}: VerdantScholarActiveAssessmentProps) {
  return (
    <div className="space-y-12">
      <VerdantScholarTopNavigation {...navigation} />
      <main className="mx-auto w-full max-w-[var(--vs-layout-max-width)] space-y-8 px-6 pb-10 lg:px-8">
        <header className="space-y-4 pt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[length:var(--vs-font-label-md)] font-bold uppercase tracking-[0.18em] text-[var(--vs-color-primary)]">
                Current Assessment
              </p>
              <h1 className="mt-2 text-[length:var(--vs-font-headline-md)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
                {title}
              </h1>
            </div>
            <p className="text-sm text-[var(--vs-color-on-surface-variant)]">
              {questionCountLabel}
            </p>
          </div>
          <VerdantScholarProgressBar value={progress} />
        </header>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.8fr)]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[var(--vs-radius-xl)] bg-[var(--vs-color-inverse-surface)]">
              <img
                alt={imageAlt}
                className="aspect-square w-full object-cover"
                src={imageUrl}
              />
            </div>
            <VerdantScholarFactCard
              rows={[
                { label: "Likelihood to remember", value: "82%" },
                { label: "Difficulty", value: "Intermediate" },
              ]}
              summary={observationBody}
              title="Morphological Observation"
              tone="surface"
            />
          </div>
          <div className="space-y-6">
            <div className="space-y-5">
              <h2 className="text-[length:var(--vs-font-headline-md)] leading-tight text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
                {question}
              </h2>
              <div className="space-y-4">
                {answers.map((answer) => (
                  <VerdantScholarAnswerOption
                    key={`${answer.optionKey}-${answer.label}`}
                    {...answer}
                  />
                ))}
              </div>
            </div>
            <VerdantScholarFactCard
              icon={
                <Lightbulb className="size-5 text-[var(--vs-color-primary)]" />
              }
              summary={insight}
              title="Taxonomic Insight"
              tone="surface"
            />
            <div className="flex items-center gap-3">
              <VerdantScholarButton
                className="flex-1 justify-center"
                trailingIcon={<span aria-hidden>→</span>}
              >
                Next Question
              </VerdantScholarButton>
              <VerdantScholarIconButton
                aria-label="Bookmark"
                size="lg"
                tone="toolbar"
              >
                <Bookmark className="size-4 text-[var(--vs-color-on-surface-variant)]" />
              </VerdantScholarIconButton>
            </div>
          </div>
        </section>
      </main>
      <VerdantScholarFooter {...footer} />
    </div>
  );
}
