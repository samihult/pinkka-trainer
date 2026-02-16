"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { TestPreferences } from "@/lib/types";
import { ListChecks, PenLine } from "lucide-react";

/** Props for the TestSettingsCard component. */
export interface TestSettingsCardProps {
  /** Available question count options. */
  questionOptions: number[];
  /** Total number of species in the stack. */
  speciesCount: number;
  /** Current test preferences. */
  testPreferences: TestPreferences;
  /** Whether the test can be started. */
  canStartTest: boolean;
  /** Updates test preference values. */
  onPreferencesChange: (updates: Partial<TestPreferences>) => void;
  /** Starts the test. */
  onStartTest: () => void;
}

/** Renders the test settings card for selecting test options. */
export function TestSettingsCard({
  questionOptions,
  speciesCount,
  testPreferences,
  canStartTest,
  onPreferencesChange,
  onStartTest,
}: TestSettingsCardProps) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Test Settings</CardTitle>
        <p className="text-sm text-muted-foreground">
          Customize how this test will run.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Number of species</Label>
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
                  {option === 0 ? "All" : option}
                </Button>
              );
            })}
          </div>
          {testPreferences.questionCount > 0 &&
            testPreferences.questionCount < speciesCount && (
              <p className="text-sm text-muted-foreground">
                Randomly selected from {speciesCount} species.
              </p>
            )}
          {(testPreferences.questionCount >= speciesCount ||
            testPreferences.questionCount === 0) && (
            <p className="text-sm text-muted-foreground">
              All {speciesCount} species.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Test mode</Label>
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
                Pick from four options
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
                Write the species name
              </span>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Pick a multiple-choice answer or type the name yourself.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Accepted answer</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={
                testPreferences.answerMode === "scientific"
                  ? "default"
                  : "outline"
              }
              onClick={() => onPreferencesChange({ answerMode: "scientific" })}
            >
              Scientific name only
            </Button>
            <Button
              type="button"
              variant={
                testPreferences.answerMode === "vernacular"
                  ? "default"
                  : "outline"
              }
              onClick={() => onPreferencesChange({ answerMode: "vernacular" })}
            >
              Vernacular name only
            </Button>
            <Button
              type="button"
              variant={
                testPreferences.answerMode === "either" ? "default" : "outline"
              }
              onClick={() => onPreferencesChange({ answerMode: "either" })}
            >
              Scientific or vernacular
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Applies to both test modes; answers ignore case and extra spaces.
          </p>
        </div>

        <Button
          onClick={onStartTest}
          className="w-full"
          size="lg"
          disabled={!canStartTest}
        >
          Start ⏎
        </Button>
      </CardContent>
    </Card>
  );
}
