"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StackLearningHistogram } from "@/components/learning/stack-learning-histogram";
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
  learningHistogram,
  onRestart,
}: TestCompletedCardProps) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-3xl">Test Complete!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-6xl font-bold text-primary mb-2">
            {percentage}%
          </div>
          <p className="text-xl text-muted-foreground">
            You got {correctAnswers} out of {totalQuestions} correct
          </p>
        </div>

        {learningHistogram && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">
              Stack learning status
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
            Take Test Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full bg-transparent"
            size="lg"
          >
            <Link href={`/learn/cards/${stackId}`}>Study Cards</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Back to All Stacks</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
