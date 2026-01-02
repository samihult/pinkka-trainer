"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/loading-spinner";
import { getStack, getSpecies } from "@/lib/firestore-helpers";
import type { Stack, Species } from "@/lib/types";
import { ArrowLeft, CheckCircle2, XCircle, RotateCw } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface QuizQuestion {
  species: Species;
  options: Species[];
  correctAnswer: Species;
}

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const stackId = params.stackId as string;

  const [stack, setStack] = useState<Stack | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<Species | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [stackId]);

  const loadData = async () => {
    try {
      const [stackData, speciesData] = await Promise.all([
        getStack(stackId),
        getSpecies(stackId),
      ]);
      setStack(stackData);
      setSpecies(speciesData);

      if (speciesData.length >= 2) {
        generateQuestions(speciesData);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateQuestions = (allSpecies: Species[]) => {
    const shuffled = [...allSpecies].sort(() => Math.random() - 0.5);
    const quizQuestions: QuizQuestion[] = [];

    shuffled.forEach((correctSpecies) => {
      // Get 3 random wrong answers
      const wrongOptions = allSpecies
        .filter((s) => s.id !== correctSpecies.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const options = [...wrongOptions, correctSpecies].sort(
        () => Math.random() - 0.5,
      );

      quizQuestions.push({
        species: correctSpecies,
        options,
        correctAnswer: correctSpecies,
      });
    });

    setQuestions(quizQuestions);
  };

  const handleAnswerSelect = (answer: Species) => {
    if (answered) return;

    setSelectedAnswer(answer);
    setAnswered(true);

    if (answer.id === currentQuestion.correctAnswer.id) {
      setCorrectAnswers(correctAnswers + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    } else {
      setQuizComplete(true);
    }
  };

  const handleRestart = () => {
    generateQuestions(species);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswered(false);
    setCorrectAnswers(0);
    setQuizComplete(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <Navbar />
        <LoadingSpinner className="py-12" />
      </div>
    );
  }

  if (!stack || species.length < 2) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/learn">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Learning
            </Link>
          </Button>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              This stack needs at least 2 species to create a quiz
            </p>
            <Button asChild>
              <Link href="/learn">Browse Other Stacks</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  if (quizComplete) {
    const percentage = Math.round((correctAnswers / questions.length) * 100);

    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/learn">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Learning
            </Link>
          </Button>

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center text-3xl">
                Quiz Complete!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-6xl font-bold text-primary mb-2">
                  {percentage}%
                </div>
                <p className="text-xl text-muted-foreground">
                  You got {correctAnswers} out of {questions.length} correct
                </p>
              </div>

              <div className="pt-6 border-t space-y-2">
                <Button onClick={handleRestart} className="w-full" size="lg">
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
                  <Link href="/learn">Back to Learning</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/learn">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Learning
            </Link>
          </Button>

          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">{stack.name} Quiz</h1>
            <span className="text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>

          <Progress value={progress} className="h-2" />
        </div>

        <div className="max-w-3xl mx-auto">
          {currentQuestion && (
            <>
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4 text-center">
                    What species is shown in this image?
                  </h2>

                  {currentQuestion.species.images &&
                  currentQuestion.species.images.length > 0 ? (
                    <div className="relative h-80 rounded-lg overflow-hidden mb-4">
                      <Image
                        src={
                          currentQuestion.species.images[0].url ||
                          "/placeholder.svg"
                        }
                        alt="Species to identify"
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                  ) : (
                    <div className="h-80 bg-muted rounded-lg flex items-center justify-center mb-4">
                      <p className="text-muted-foreground">
                        No image available
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedAnswer?.id === option.id;
                  const isCorrect =
                    option.id === currentQuestion.correctAnswer.id;
                  const showResult = answered;

                  let buttonVariant: "outline" | "default" | "destructive" =
                    "outline";
                  if (showResult) {
                    if (isCorrect) {
                      buttonVariant = "default";
                    } else if (isSelected && !isCorrect) {
                      buttonVariant = "destructive";
                    }
                  }

                  return (
                    <Button
                      key={option.id}
                      onClick={() => handleAnswerSelect(option)}
                      variant={buttonVariant}
                      disabled={answered}
                      className={`h-auto py-4 px-6 text-left justify-start ${
                        showResult && isCorrect ? "bg-primary" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-1">
                          <p className="font-semibold">
                            {option.scientificName}
                          </p>
                          {option.finnishName && (
                            <p className="text-sm opacity-80">
                              {option.finnishName}
                            </p>
                          )}
                        </div>
                        {showResult && isCorrect && (
                          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                        )}
                        {showResult && isSelected && !isCorrect && (
                          <XCircle className="h-5 w-5 flex-shrink-0" />
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>

              {answered && (
                <div className="text-center">
                  <Button onClick={handleNext} size="lg">
                    {currentQuestionIndex < questions.length - 1
                      ? "Next Question"
                      : "Finish Quiz"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
