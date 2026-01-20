"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { QuizPreferences } from "@/lib/types";
import { ListChecks, PenLine } from "lucide-react";

/** Props for the QuizSettingsCard component. */
export interface QuizSettingsCardProps {
  /** Available question count options. */
  questionOptions: number[];
  /** Maximum number of questions in the stack. */
  maxQuestions: number;
  /** Total number of species in the stack. */
  speciesCount: number;
  /** Current quiz preferences. */
  quizPreferences: QuizPreferences;
  /** Whether the quiz can be started. */
  canStartQuiz: boolean;
  /** Updates quiz preference values. */
  onPreferencesChange: (updates: Partial<QuizPreferences>) => void;
  /** Starts the quiz. */
  onStartQuiz: () => void;
}

/** Renders the quiz settings card for selecting quiz options. */
export function QuizSettingsCard({
  questionOptions,
  maxQuestions,
  speciesCount,
  quizPreferences,
  canStartQuiz,
  onPreferencesChange,
  onStartQuiz,
}: QuizSettingsCardProps) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Quiz Settings</CardTitle>
        <p className="text-sm text-muted-foreground">
          Customize how this quiz will run.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Number of questions</Label>
          <div className="flex flex-wrap gap-2">
            {questionOptions.map((option) => {
              const isSelected =
                quizPreferences.questionCount === option &&
                maxQuestions !== option;
              return (
                <Button
                  key={option}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => onPreferencesChange({ questionCount: option })}
                >
                  {option}
                </Button>
              );
            })}
            <Button
              type="button"
              variant={
                quizPreferences.questionCount === 0 ? "default" : "outline"
              }
              onClick={() => onPreferencesChange({ questionCount: 0 })}
            >
              All
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Randomly selected from {speciesCount} species.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Quiz mode</Label>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant={
                quizPreferences.mode === "multiple-choice"
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
                quizPreferences.mode === "write-name" ? "default" : "outline"
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

        {quizPreferences.mode === "write-name" && (
          <div className="space-y-2">
            <Label>Accepted answer</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={
                  quizPreferences.answerMode === "scientific"
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  onPreferencesChange({ answerMode: "scientific" })
                }
              >
                Scientific name only
              </Button>
              <Button
                type="button"
                variant={
                  quizPreferences.answerMode === "vernacular"
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  onPreferencesChange({ answerMode: "vernacular" })
                }
              >
                Vernacular name only
              </Button>
              <Button
                type="button"
                variant={
                  quizPreferences.answerMode === "either"
                    ? "default"
                    : "outline"
                }
                onClick={() => onPreferencesChange({ answerMode: "either" })}
              >
                Scientific or vernacular
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Answers are case-insensitive and ignore extra spaces.
            </p>
          </div>
        )}

        <Button
          onClick={onStartQuiz}
          className="w-full"
          size="lg"
          disabled={!canStartQuiz}
        >
          Start Quiz ⏎
        </Button>
      </CardContent>
    </Card>
  );
}
