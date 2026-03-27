/** Live test setup panel composed from Verdant Scholar atoms for direct app/runtime parity checks. */
"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Filter,
  Globe2,
  Lightbulb,
  ListChecks,
  PenLine,
} from "lucide-react";

import {
  VerdantScholarButton,
  VerdantScholarCard,
  VerdantScholarCardContent,
  VerdantScholarChoiceCard,
  VerdantScholarChoiceChip,
  VerdantScholarHeading,
  VerdantScholarIconButton,
  VerdantScholarSectionHeading,
  VerdantScholarText,
} from "@/components/verdant-scholar";
import { useI18n } from "@/lib/i18n";
import type { TestPreferences } from "@/lib/types";
import Link from "next/link";

/** Props for the TestSettingsCard component. */
export interface TestSettingsCardProps {
  /** Available question count options. */
  questionOptions: number[];
  /** Number of species currently eligible for active settings. */
  speciesCount: number;
  /** Total number of species with test images in this stack. */
  totalSpeciesCount: number;
  /** Current test preferences. */
  testPreferences: TestPreferences;
  /** Whether the test can be started. */
  canStartTest: boolean;
  /** Optional message shown when the active settings cannot start a test. */
  unavailableReason?: string | null;
  /** Updates test preference values. */
  onPreferencesChange: (updates: Partial<TestPreferences>) => void;
  /** Starts the test. */
  onStartTest: () => void;
  /** Where to go back. */
  exitHref: string;
  /** Group name. */
  groupName: string;
  /** Stack name */
  stackName: string;
}

/** Renders the test settings card for selecting test options. */
export function TestSettingsCard({
  questionOptions,
  speciesCount,
  totalSpeciesCount,
  testPreferences,
  canStartTest,
  unavailableReason,
  onPreferencesChange,
  onStartTest,
  exitHref,
  groupName,
  stackName,
}: TestSettingsCardProps) {
  const { t } = useI18n();

  const questionSummary =
    testPreferences.questionCount > 0 &&
    testPreferences.questionCount < speciesCount
      ? t("test.settings.randomlySelected", { speciesCount })
      : t("test.settings.allSpecies", { speciesCount });

  return (
    <section className="mx-auto w-full max-w-3xl space-y-8">
      <div className="flex min-w-0 items-center gap-3">
        <Link href={exitHref} aria-label={t("group.backToHome")}>
          <VerdantScholarIconButton tone="surface" size="lg">
            <ArrowLeft className="size-5" />
          </VerdantScholarIconButton>
        </Link>
        <div className="min-w-0">
          {groupName ? (
            <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-[var(--vs-color-on-surface-variant)]">
              {groupName}
            </p>
          ) : null}
          <p className="truncate text-base font-semibold [font-family:var(--vs-font-display-family)] text-[var(--vs-color-on-surface)]">
            {stackName}
          </p>
        </div>
      </div>

      <VerdantScholarCard tone="surface">
        <VerdantScholarCardContent className="space-y-8 pt-8">
          <div className="space-y-4">
            <VerdantScholarSectionHeading title={t("test.settings.title")} />
          </div>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-[var(--vs-color-primary)]" />
              <VerdantScholarHeading asChild variant="subheadline">
                <h2>{t("test.settings.numberOfSpecies")}</h2>
              </VerdantScholarHeading>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {questionOptions.map((option) => (
                <VerdantScholarChoiceChip
                  className="h-auto justify-center px-4 py-4 text-center"
                  key={option}
                  onClick={() => onPreferencesChange({ questionCount: option })}
                  selected={testPreferences.questionCount === option}
                >
                  {option === 0 ? t("test.settings.all") : option}
                </VerdantScholarChoiceChip>
              ))}
            </div>
            <VerdantScholarText tone="muted" variant="meta">
              {questionSummary}
            </VerdantScholarText>
            {speciesCount < totalSpeciesCount ? (
              <VerdantScholarText tone="muted" variant="meta">
                {t("test.settings.availableSpecies", {
                  available: speciesCount,
                  total: totalSpeciesCount,
                })}
              </VerdantScholarText>
            ) : null}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4 text-[var(--vs-color-primary)]" />
              <VerdantScholarHeading asChild variant="subheadline">
                <h2>{t("test.settings.mode")}</h2>
              </VerdantScholarHeading>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <VerdantScholarChoiceCard
                onClick={() => onPreferencesChange({ mode: "multiple-choice" })}
                selected={testPreferences.mode === "multiple-choice"}
                title={t("test.settings.mode.multipleChoice")}
                trailing={
                  <div className="rounded-full bg-[color:rgba(63,106,0,0.08)] p-2 text-[var(--vs-color-primary)]">
                    <ListChecks className="size-4" />
                  </div>
                }
              />
              <VerdantScholarChoiceCard
                onClick={() => onPreferencesChange({ mode: "write-name" })}
                selected={testPreferences.mode === "write-name"}
                title={t("test.settings.mode.writeName")}
                trailing={
                  <div className="rounded-full bg-[color:rgba(63,106,0,0.08)] p-2 text-[var(--vs-color-primary)]">
                    <PenLine className="size-4" />
                  </div>
                }
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe2 className="size-4 text-[var(--vs-color-primary)]" />
              <VerdantScholarHeading asChild variant="subheadline">
                <h2>{t("test.settings.answerScope")}</h2>
              </VerdantScholarHeading>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <VerdantScholarChoiceCard
                onClick={() => onPreferencesChange({ answerScope: "species" })}
                selected={testPreferences.answerScope === "species"}
                title={t("test.settings.scope.species")}
                trailing={
                  testPreferences.answerScope === "species" ? (
                    <CheckCircle2 className="size-4 text-[var(--vs-color-primary)]" />
                  ) : (
                    <Circle className="size-4 text-[var(--vs-color-on-surface-variant)]" />
                  )
                }
              />
              <VerdantScholarChoiceCard
                onClick={() => onPreferencesChange({ answerScope: "genus" })}
                selected={testPreferences.answerScope === "genus"}
                title={t("test.settings.scope.genus")}
                trailing={
                  testPreferences.answerScope === "genus" ? (
                    <CheckCircle2 className="size-4 text-[var(--vs-color-primary)]" />
                  ) : (
                    <Circle className="size-4 text-[var(--vs-color-on-surface-variant)]" />
                  )
                }
              />
              <VerdantScholarChoiceCard
                onClick={() => onPreferencesChange({ answerScope: "family" })}
                selected={testPreferences.answerScope === "family"}
                title={t("test.settings.scope.family")}
                trailing={
                  testPreferences.answerScope === "family" ? (
                    <CheckCircle2 className="size-4 text-[var(--vs-color-primary)]" />
                  ) : (
                    <Circle className="size-4 text-[var(--vs-color-on-surface-variant)]" />
                  )
                }
              />
              <VerdantScholarChoiceCard
                onClick={() =>
                  onPreferencesChange({ answerNameMode: "scientific" })
                }
                selected={testPreferences.answerNameMode === "scientific"}
                title={t("test.settings.nameMode.scientific")}
                trailing={
                  testPreferences.answerNameMode === "scientific" ? (
                    <CheckCircle2 className="size-4 text-[var(--vs-color-primary)]" />
                  ) : (
                    <Circle className="size-4 text-[var(--vs-color-on-surface-variant)]" />
                  )
                }
              />
              <VerdantScholarChoiceCard
                onClick={() =>
                  onPreferencesChange({ answerNameMode: "vernacular" })
                }
                selected={testPreferences.answerNameMode === "vernacular"}
                title={t("test.settings.nameMode.vernacular")}
                trailing={
                  testPreferences.answerNameMode === "vernacular" ? (
                    <CheckCircle2 className="size-4 text-[var(--vs-color-primary)]" />
                  ) : (
                    <Circle className="size-4 text-[var(--vs-color-on-surface-variant)]" />
                  )
                }
              />
              <VerdantScholarChoiceCard
                onClick={() =>
                  onPreferencesChange({ answerNameMode: "either" })
                }
                selected={testPreferences.answerNameMode === "either"}
                title={t("test.settings.nameMode.either")}
                trailing={
                  testPreferences.answerNameMode === "either" ? (
                    <CheckCircle2 className="size-4 text-[var(--vs-color-primary)]" />
                  ) : (
                    <Circle className="size-4 text-[var(--vs-color-on-surface-variant)]" />
                  )
                }
              />
            </div>
          </section>

          <div className="space-y-4 flex items-center justify-end">
            <VerdantScholarButton
              className="justify-center"
              disabled={!canStartTest}
              onClick={onStartTest}
              size="lg"
              trailingIcon={<span aria-hidden>▶</span>}
            >
              {t("test.settings.start")}
            </VerdantScholarButton>

            {!canStartTest && unavailableReason ? (
              <VerdantScholarText
                asChild
                className="text-center"
                tone="primary"
                variant="label"
              >
                <p>{unavailableReason}</p>
              </VerdantScholarText>
            ) : null}
          </div>
        </VerdantScholarCardContent>
      </VerdantScholarCard>
    </section>
  );
}
