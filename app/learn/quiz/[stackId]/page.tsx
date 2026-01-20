"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/loading-spinner";
import { QuizCompletedCard } from "@/components/quiz/quiz-completed-card";
import { QuizSettingsCard } from "@/components/quiz/quiz-settings-card";
import { QuizSpeciesCard } from "@/components/quiz/quiz-species-card";
import { useAuth } from "@/lib/auth-context";
import {
  getStack,
  getSpecies,
  getUserQuizPreferences,
  updateUserQuizPreferences,
} from "@/lib/firebase/firestore-helpers";
import type {
  QuizAnswerMode,
  QuizMode,
  QuizPreferences,
  Stack,
  Species,
} from "@/lib/types";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";
import {
  DEFAULT_QUIZ_PREFERENCES,
  normalizeQuizPreferences,
} from "@/lib/quiz/quiz-preferences";
import { logFirestoreError } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

/** Quiz prompt data for a single question. */
interface QuizQuestion {
  /** Species being asked about. */
  species: Species;
  /** Multiple-choice options for the prompt. */
  options: Species[];
  /** Correct answer for grading. */
  correctAnswer: Species;
}

/** Quiz experience for a single stack. */
export default function QuizPage() {
  const params = useParams();
  const stackId = params.stackId as string;
  const { user } = useAuth();

  const [stack, setStack] = useState<Stack | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<Species | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quizPreferences, setQuizPreferences] =
    useState<QuizPreferences | null>(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [textAnswer, setTextAnswer] = useState("");
  const [textAnswerCorrect, setTextAnswerCorrect] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    void loadData();
  }, [stackId, user?.uid]);

  const loadData = async () => {
    setLoading(true);
    setPreferencesLoaded(false);
    try {
      const [stackData, speciesData] = await Promise.all([
        getStack(stackId),
        getSpecies(stackId),
      ]);
      setStack(stackData);
      setSpecies(speciesData);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setAnswered(false);
      setCorrectAnswers(0);
      setQuizComplete(false);
      setShowSettings(true);
      setTextAnswer("");
      setTextAnswerCorrect(null);

      const storedPreferences = user
        ? await getUserQuizPreferences(user.uid)
        : null;
      setQuizPreferences(
        normalizeQuizPreferences(storedPreferences, DEFAULT_QUIZ_PREFERENCES),
      );
      setPreferencesLoaded(true);
    } catch (error) {
      logFirestoreError("Failed to load quiz data", error);
    } finally {
      setLoading(false);
    }
  };

  const generateQuestions = (allSpecies: Species[], questionCount: number) => {
    const shuffled = [...allSpecies].sort(() => Math.random() - 0.5);
    const quizQuestions: QuizQuestion[] = [];
    const selectedSpecies = shuffled.slice(
      0,
      Math.min(questionCount, allSpecies.length),
    );

    selectedSpecies.forEach((correctSpecies) => {
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
      setCorrectAnswers((previous) => previous + 1);
    }
  };

  const normalizeAnswerText = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, " ");

  const getAcceptedAnswers = (
    targetSpecies: Species,
    answerMode: QuizAnswerMode,
  ) => {
    const scientificName = targetSpecies.data.scientificName;
    const vernacularName = getLocalizedText(
      targetSpecies.data.vernacularName,
      "fi",
    );

    if (answerMode === "scientific") {
      return [scientificName];
    }

    if (answerMode === "vernacular") {
      return vernacularName ? [vernacularName] : [scientificName];
    }

    return vernacularName ? [scientificName, vernacularName] : [scientificName];
  };

  const handleTextAnswerSubmit = () => {
    if (answered || !currentQuestion || !quizPreferences) return;

    const normalizedAnswer = normalizeAnswerText(textAnswer);
    if (!normalizedAnswer) return;

    const acceptedAnswers = getAcceptedAnswers(
      currentQuestion.species,
      quizPreferences.answerMode,
    ).map(normalizeAnswerText);
    const isCorrect = acceptedAnswers.includes(normalizedAnswer);

    setAnswered(true);
    setTextAnswerCorrect(isCorrect);

    if (isCorrect) {
      setCorrectAnswers((previous) => previous + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setAnswered(false);
      setTextAnswer("");
      setTextAnswerCorrect(null);
    } else {
      setQuizComplete(true);
    }
  };

  const handleRestart = () => {
    startQuiz();
  };

  const handlePreferencesChange = async (updates: Partial<QuizPreferences>) => {
    if (!quizPreferences) return;

    const nextPreferences = normalizeQuizPreferences({
      ...quizPreferences,
      ...updates,
    });
    setQuizPreferences(nextPreferences);

    if (!preferencesLoaded || !user) return;

    try {
      await updateUserQuizPreferences(user.uid, nextPreferences);
    } catch (error) {
      logFirestoreError("Failed to save quiz preferences", error);
    }
  };

  const startQuiz = () => {
    if (!quizPreferences) return;
    const clampedCount = Math.min(
      Math.max(quizPreferences.questionCount, 2),
      species.length,
    );

    generateQuestions(species, clampedCount);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswered(false);
    setCorrectAnswers(0);
    setQuizComplete(false);
    setTextAnswer("");
    setTextAnswerCorrect(null);
    setShowSettings(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <LoadingSpinner className="py-12" />
      </div>
    );
  }

  if (!stack || species.length < 2) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <main className="container mx-auto px-4 py-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Learning
            </Link>
          </Button>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              This stack needs at least 2 species to create a quiz
            </p>
            <Button asChild>
              <Link href="/">Browse Other Stacks</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (!quizPreferences) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <LoadingSpinner className="py-12" />
      </div>
    );
  }

  if (showSettings) {
    const maxQuestions = species.length;
    const questionOptions = [10, 25, 50, 0];

    // Default to 10 cards
    if (!questionOptions.includes(quizPreferences.questionCount)) {
      quizPreferences.questionCount = 10;
    }

    const displayQuestionCount = Math.min(
      Math.max(quizPreferences.questionCount, 2),
      maxQuestions,
    );

    const canStartQuiz = displayQuestionCount >= 2;

    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <main className="container mx-auto px-4 py-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Learning
            </Link>
          </Button>

          <QuizSettingsCard
            questionOptions={questionOptions}
            maxQuestions={maxQuestions}
            speciesCount={species.length}
            quizPreferences={quizPreferences}
            canStartQuiz={canStartQuiz}
            onPreferencesChange={handlePreferencesChange}
            onStartQuiz={startQuiz}
          />
        </main>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <LoadingSpinner className="py-12" />
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const currentVernacularName = getLocalizedText(
    currentQuestion.species.data.vernacularName,
    "fi",
  );

  if (quizComplete) {
    const percentage = Math.round((correctAnswers / questions.length) * 100);

    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <main className="container mx-auto px-4 py-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Learning
            </Link>
          </Button>

          <QuizCompletedCard
            percentage={percentage}
            correctAnswers={correctAnswers}
            totalQuestions={questions.length}
            stackId={stackId}
            onRestart={handleRestart}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Learning
            </Link>
          </Button>

          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">
              {getLocalizedText(stack.data.name, "fi")} Quiz
            </h1>
            <span className="text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>

          <Progress value={progress} className="h-2" />
        </div>

        <div className="max-w-3xl mx-auto">
          {currentQuestion && (
            <>
              <QuizSpeciesCard species={currentQuestion.species} />

              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                {quizPreferences.mode === "multiple-choice" ? (
                  currentQuestion.options.map((option) => {
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
                              {option.data.scientificName}
                            </p>
                            {getLocalizedText(
                              option.data.vernacularName,
                              "fi",
                            ) && (
                              <p className="text-sm opacity-80">
                                {getLocalizedText(
                                  option.data.vernacularName,
                                  "fi",
                                )}
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
                  })
                ) : (
                  <div className="sm:col-span-2 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="text-answer">Species name</Label>
                      <Input
                        id="text-answer"
                        value={textAnswer}
                        onChange={(event) => setTextAnswer(event.target.value)}
                        placeholder="Type the species name"
                        disabled={answered}
                      />
                      <p className="text-sm text-muted-foreground">
                        {quizPreferences.answerMode === "scientific" &&
                          "Scientific name required."}
                        {quizPreferences.answerMode === "vernacular" &&
                          (currentVernacularName
                            ? "Vernacular name required."
                            : "Vernacular name missing; scientific name accepted.")}
                        {quizPreferences.answerMode === "either" &&
                          "Scientific or vernacular name accepted."}
                      </p>
                    </div>
                    <Button
                      onClick={handleTextAnswerSubmit}
                      size="lg"
                      disabled={answered || !textAnswer.trim()}
                    >
                      Submit Answer
                    </Button>
                    {answered && textAnswerCorrect !== null && (
                      <div
                        className={`rounded-lg border p-4 ${
                          textAnswerCorrect
                            ? "border-primary/40 bg-primary/5"
                            : "border-destructive/40 bg-destructive/5"
                        }`}
                      >
                        <p className="font-semibold">
                          {textAnswerCorrect ? "Correct!" : "Not quite."}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Correct answer:{" "}
                          {currentQuestion.species.data.scientificName}
                          {currentVernacularName
                            ? ` (${currentVernacularName})`
                            : ""}
                        </p>
                      </div>
                    )}
                  </div>
                )}
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
