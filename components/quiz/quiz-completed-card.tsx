"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCw } from "lucide-react";
import Link from "next/link";

/** Props for the QuizCompletedCard component. */
export interface QuizCompletedCardProps {
  /** Final score percentage for the quiz. */
  percentage: number;
  /** Number of correct answers. */
  correctAnswers: number;
  /** Total number of questions in the quiz. */
  totalQuestions: number;
  /** Stack identifier used for navigation links. */
  stackId: string;
  /** Handler for restarting the quiz. */
  onRestart: () => void;
}

/** Renders the completed quiz summary card and next actions. */
export function QuizCompletedCard({
  percentage,
  correctAnswers,
  totalQuestions,
  stackId,
  onRestart,
}: QuizCompletedCardProps) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-3xl">Quiz Complete!</CardTitle>
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

        <div className="pt-6 border-t space-y-2">
          <Button onClick={onRestart} className="w-full" size="lg">
            <RotateCw className="mr-2 h-4 w-4" />
            Take Quiz Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full bg-transparent"
            size="lg"
          >
            <Link href={`/learn/flashcards/${stackId}`}>
              Study Flashcards
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Back to Learning</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
