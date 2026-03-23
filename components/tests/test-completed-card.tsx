"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StackLearningHistogram } from "@/components/learning/stack-learning-histogram";
import { useI18n } from "@/lib/i18n";
import type { StackLearningHistogram as StackLearningHistogramData } from "@/lib/types";
import { RotateCw } from "lucide-react";
import Link from "next/link";

/** Props for the TestCompletedCard component. */
export interface TestCompletedCardProps {
  /** Final score percentage for the test. */
  percentage: number;
  /** Number of correct answers. */
  correctAnswers: number;
  /** Total number of questions in the test. */
  totalQuestions: number;
  /** Stack identifier used for navigation links. */
  stackId: string;
  /** Href for continuing to stack card study while preserving collection context. */
  studyHref?: string;
  /** Href for returning to the relevant collection or fallback browse page. */
  backHref: string;
  /** Optional learning histogram for the stack. */
  learningHistogram?: StackLearningHistogramData | null;
  /** Handler for restarting the test. */
  onRestart: () => void;
}

/** Renders the completed test summary card and next actions. */
export function TestCompletedCard({
  percentage,
  correctAnswers,
  totalQuestions,
  stackId,
  studyHref,
  backHref,
  learningHistogram,
  onRestart,
}: TestCompletedCardProps) {
  const { t } = useI18n();

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-3xl">
          {t("test.completed.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-6xl font-bold text-primary mb-2">
            {percentage}%
          </div>
          <p className="text-xl text-muted-foreground">
            {t("test.completed.scoreLine", {
              correctAnswers,
              totalQuestions,
            })}
          </p>
        </div>

        {learningHistogram && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">
              {t("test.completed.stackStatus")}
            </p>
            <StackLearningHistogram
              scientific={learningHistogram.scientific}
              vernacular={learningHistogram.vernacular}
              either={learningHistogram.either}
            />
          </div>
        )}

        <div className="pt-3 space-y-2">
          <Button onClick={onRestart} className="w-full" size="lg">
            <RotateCw className="mr-2 h-4 w-4" />
            {t("test.completed.takeAgain")}
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full bg-transparent"
            size="lg"
          >
            <Link href={studyHref ?? `/learn/cards/${stackId}`}>
              {t("test.completed.studyCards")}
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href={backHref}>{t("test.completed.backToStacks")}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
