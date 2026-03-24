"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import type { TestPreferences } from "@/lib/types";
import { ListChecks, PenLine } from "lucide-react";

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
}: TestSettingsCardProps) {
  const { t } = useI18n();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">{t("test.settings.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("test.settings.description")}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{t("test.settings.numberOfSpecies")}</Label>
          <div className="flex flex-wrap gap-2">
            {questionOptions.map((option) => {
              const isSelected = testPreferences.questionCount === option;
              return (
                <Button
                  key={option}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => onPreferencesChange({ questionCount: option })}
                >
                  {option === 0 ? t("test.settings.all") : option}
                </Button>
              );
            })}
          </div>
          {testPreferences.questionCount > 0 &&
            testPreferences.questionCount < speciesCount && (
              <p className="text-sm text-muted-foreground">
                {t("test.settings.randomlySelected", { speciesCount })}
              </p>
            )}
          {(testPreferences.questionCount >= speciesCount ||
            testPreferences.questionCount === 0) && (
            <p className="text-sm text-muted-foreground">
              {t("test.settings.allSpecies", { speciesCount })}
            </p>
          )}
          {speciesCount < totalSpeciesCount && (
            <p className="text-sm text-muted-foreground">
              {t("test.settings.availableSpecies", {
                available: speciesCount,
                total: totalSpeciesCount,
              })}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t("test.settings.mode")}</Label>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant={
                testPreferences.mode === "multiple-choice"
                  ? "default"
                  : "outline"
              }
              onClick={() => onPreferencesChange({ mode: "multiple-choice" })}
              className="w-40 h-30 flex-col items-center justify-between gap-0 whitespace-normal p-3 text-center"
            >
              <ListChecks
                size={200}
                strokeWidth={8}
                absoluteStrokeWidth
                className="size-12"
                aria-hidden="true"
              />
              <span className="text-sm font-semibold">
                {t("test.settings.mode.multipleChoice")}
              </span>
            </Button>
            <Button
              type="button"
              variant={
                testPreferences.mode === "write-name" ? "default" : "outline"
              }
              onClick={() => onPreferencesChange({ mode: "write-name" })}
              className="w-40 h-30 flex-col items-center justify-between gap-0 whitespace-normal p-3 text-center"
            >
              <PenLine
                size={200}
                strokeWidth={8}
                absoluteStrokeWidth
                className="size-12"
                aria-hidden="true"
              />
              <span className="text-sm font-semibold">
                {t("test.settings.mode.writeName")}
              </span>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("test.settings.mode.description")}
          </p>
        </div>

        <div className="space-y-2">
          <Label>{t("test.settings.answerScope")}</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={
                testPreferences.answerScope === "species"
                  ? "default"
                  : "outline"
              }
              onClick={() => onPreferencesChange({ answerScope: "species" })}
            >
              {t("test.settings.scope.species")}
            </Button>
            <Button
              type="button"
              variant={
                testPreferences.answerScope === "genus" ? "default" : "outline"
              }
              onClick={() => onPreferencesChange({ answerScope: "genus" })}
            >
              {t("test.settings.scope.genus")}
            </Button>
            <Button
              type="button"
              variant={
                testPreferences.answerScope === "family" ? "default" : "outline"
              }
              onClick={() => onPreferencesChange({ answerScope: "family" })}
            >
              {t("test.settings.scope.family")}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("test.settings.scope.description")}
          </p>
        </div>

        <div className="space-y-2">
          <Label>{t("test.settings.answerNameMode")}</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={
                testPreferences.answerNameMode === "scientific"
                  ? "default"
                  : "outline"
              }
              onClick={() =>
                onPreferencesChange({ answerNameMode: "scientific" })
              }
            >
              {t("test.settings.nameMode.scientific")}
            </Button>
            <Button
              type="button"
              variant={
                testPreferences.answerNameMode === "vernacular"
                  ? "default"
                  : "outline"
              }
              onClick={() =>
                onPreferencesChange({ answerNameMode: "vernacular" })
              }
            >
              {t("test.settings.nameMode.vernacular")}
            </Button>
            <Button
              type="button"
              variant={
                testPreferences.answerNameMode === "either"
                  ? "default"
                  : "outline"
              }
              onClick={() => onPreferencesChange({ answerNameMode: "either" })}
            >
              {t("test.settings.nameMode.either")}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("test.settings.nameMode.description")}
          </p>
        </div>

        {!canStartTest && unavailableReason ? (
          <p className="text-sm text-destructive">{unavailableReason}</p>
        ) : null}

        <Button
          onClick={onStartTest}
          className="w-full"
          size="lg"
          disabled={!canStartTest}
        >
          {t("test.settings.start")}
        </Button>
      </CardContent>
    </Card>
  );
}
