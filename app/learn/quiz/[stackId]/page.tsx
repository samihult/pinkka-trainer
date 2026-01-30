"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/loading-spinner";
import { LearningSessionShell } from "@/components/learning-session-shell";
import { QuizCompletedCard } from "@/components/quiz/quiz-completed-card";
import { LearningStatusCard } from "@/components/quiz/learning-status-card";
import { QuizSettingsCard } from "@/components/quiz/quiz-settings-card";
import { QuizSpeciesCard } from "@/components/quiz/quiz-species-card";
import { useAuth } from "@/lib/auth-context";
import {
  getGroups,
  getLearningProgress,
  getLearningProgressForSpeciesIds,
  getStack,
  getSpecies,
  getUserQuizPreferences,
  upsertLearningProgressBatch,
  upsertStackLearningHistogram,
  updateUserQuizPreferences,
} from "@/lib/firebase/firestore-helpers";
import type {
  LearningNameType,
  LearningProgress,
  LearningProgressState,
  QuizAnswerMode,
  QuizPreferences,
  QuizMode,
  Stack,
  Species,
  Group,
  StackLearningHistogram,
} from "@/lib/types";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";
import {
  getSpeciesImageUrl,
  getSpeciesImagesWithUrls,
} from "@/lib/pinkka/pinkka-display";
import {
  DEFAULT_QUIZ_PREFERENCES,
  normalizeQuizPreferences,
} from "@/lib/quiz/quiz-preferences";
import { scoreAnswer } from "@/lib/quiz/scoring";
import { logFirestoreError } from "@/lib/utils";
import { useLanguagePreference } from "@/lib/language-context";
import {
  getStoredQuizPreferences,
  setStoredQuizPreferences,
  toLanguageCode,
} from "@/lib/local-preferences";
import {
  combineRetention,
  DEFAULT_RETENTION_HORIZON_DAYS,
  estimateRetention,
  getSpeedScore,
  updateLearningProgressState,
} from "@/lib/learning/learning-curve";
import {
  getLearningStatusLabel,
  LEARNING_STATUS_THRESHOLDS,
} from "@/lib/learning/learning-thresholds";
import { buildStackLearningHistogram } from "@/lib/learning/learning-histogram";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

/** Quiz prompt data for a single question. */
interface QuizQuestion {
  /** Species being asked about. */
  species: Species;
  /** Multiple-choice options for the prompt. */
  options: Species[];
  /** Correct answer for grading. */
  correctAnswer: Species;
  /** Image URL chosen for the quiz prompt. */
  imageUrl: string | null;
}

/** Learning update payload for a name variant. */
type LearningScoreUpdate = {
  /** Accuracy score in the 0-1 range. */
  accuracyScore: number;
  /** Response time in milliseconds. */
  responseMs: number;
  /** Expected response time baseline in milliseconds. */
  expectedMs: number;
};

const CLOSE_SCORE_THRESHOLD = 0.85;
const CORRECT_SCORE_THRESHOLD = 1.0;
const DEFAULT_EXPECTED_RESPONSE_MS: Record<QuizMode, number> = {
  "multiple-choice": 4000,
  "write-name": 9000,
};

/** Quiz experience for a single stack. */
export default function QuizPage() {
  const { language } = useLanguagePreference();
  const preferredLanguage = toLanguageCode(language);
  const params = useParams();
  const stackId = params.stackId as string;
  const { user } = useAuth();

  const [stack, setStack] = useState<Stack | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
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
  const [currentLearningProgress, setCurrentLearningProgress] = useState<{
    scientific: LearningProgressState | null;
    vernacular: LearningProgressState | null;
  } | null>(null);
  const [learningMetric, setLearningMetric] = useState<{
    label: string;
    combinedScore: number;
    accuracyScore: number | null;
    speedScore: number | null;
  } | null>(null);
  const [stackHistogram, setStackHistogram] =
    useState<StackLearningHistogram | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [textAnswerCorrect, setTextAnswerCorrect] = useState<boolean | null>(
    null,
  );
  const [textAnswerFeedback, setTextAnswerFeedback] = useState<string | null>(
    null,
  );
  const [textAnswerRetryUsed, setTextAnswerRetryUsed] = useState(false);
  const textAnswerRef = useRef<HTMLInputElement>(null);
  const questionStartRef = useRef<number>(0);
  const progressCacheRef = useRef(
    new Map<string, LearningProgressState>(),
  );
  const pendingProgressRef = useRef(
    new Map<string, Omit<LearningProgress, "id">>(),
  );

  const getQuestionCount = (requested: number, maxQuestions: number) => {
    if (requested === 0) return maxQuestions;
    return Math.min(Math.max(requested, 2), maxQuestions);
  };

  const buildProgressKey = (speciesId: string, nameType: LearningNameType) =>
    `${speciesId}_${nameType}`;

  useEffect(() => {
    void loadData();
  }, [stackId, user?.uid]);

  const loadData = async () => {
    setLoading(true);
    setPreferencesLoaded(false);
    try {
      const [stackData, speciesData, groupsData] = await Promise.all([
        getStack(stackId),
        getSpecies(stackId),
        getGroups(),
      ]);
      const speciesWithImages = speciesData.filter(
        (item) =>
          getSpeciesImagesWithUrls(item.data, item.quizImageIds).length > 0,
      );
      const resolvedGroup =
        groupsData.find((item) => item.stackIds?.includes(stackId)) ?? null;
      setStack(stackData);
      setGroup(resolvedGroup);
      setSpecies(speciesWithImages);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setAnswered(false);
      setCorrectAnswers(0);
      setQuizComplete(false);
      setShowSettings(true);
      setTextAnswer("");
      setTextAnswerCorrect(null);
      setTextAnswerFeedback(null);
      setTextAnswerRetryUsed(false);
      setCurrentLearningProgress(null);
      setLearningMetric(null);
      setStackHistogram(null);
      progressCacheRef.current = new Map();
      pendingProgressRef.current = new Map();

      const storedPreferences = user
        ? await getUserQuizPreferences(user.uid)
        : null;
      const localQuizPreferences = getStoredQuizPreferences();
      const normalizedPreferences = normalizeQuizPreferences(
        storedPreferences ?? localQuizPreferences,
        DEFAULT_QUIZ_PREFERENCES,
      );
      setQuizPreferences(normalizedPreferences);
      setStoredQuizPreferences(normalizedPreferences);
      setPreferencesLoaded(true);
    } catch (error) {
      logFirestoreError("Failed to load quiz data", error);
    } finally {
      setLoading(false);
    }
  };

  const getExpectedResponseMs = (mode: QuizMode) =>
    DEFAULT_EXPECTED_RESPONSE_MS[mode];

  const getResponseMs = () => {
    if (!questionStartRef.current) return 0;
    return Math.max(0, Date.now() - questionStartRef.current);
  };

  const pickQuizImageUrl = (targetSpecies: Species) => {
    const enabledIds = targetSpecies.quizImageIds;
    const candidates = getSpeciesImagesWithUrls(
      targetSpecies.data,
      enabledIds,
    );
    if (!candidates || candidates.length === 0) return null;
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    return getSpeciesImageUrl(selected) || null;
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
        imageUrl: pickQuizImageUrl(correctSpecies),
      });
    });

    setQuestions(quizQuestions);
  };

  const handleAnswerSelect = (answer: Species) => {
    if (answered) return;
    if (!currentQuestion || !quizPreferences) return;

    setSelectedAnswer(answer);
    setAnswered(true);

    const isCorrect = answer.id === currentQuestion.correctAnswer.id;
    if (isCorrect) {
      setCorrectAnswers((previous) => previous + 1);
    }

    void recordLearningProgress(
      currentQuestion.species,
      getLearningScoresForChoice(
        currentQuestion.species,
        quizPreferences.answerMode,
        isCorrect,
        getResponseMs(),
        getExpectedResponseMs("multiple-choice"),
      ),
    );
  };

  const getDisplayNames = (
    targetSpecies: Species,
    answerMode: QuizAnswerMode,
  ) => {
    const scientificName = targetSpecies.data.scientificName;
    const vernacularName = getLocalizedText(
      targetSpecies.data.vernacularName,
      preferredLanguage,
    );

    if (answerMode === "scientific") {
      return { primary: scientificName, secondary: null };
    }

    if (answerMode === "vernacular") {
      return {
        primary: vernacularName ?? scientificName,
        secondary: null,
      };
    }

    return {
      primary: scientificName,
      secondary: vernacularName ?? null,
    };
  };

  const getAcceptedAnswers = (
    targetSpecies: Species,
    answerMode: QuizAnswerMode,
  ) => {
    const scientificName = targetSpecies.data.scientificName;
    const vernacularName = getLocalizedText(
      targetSpecies.data.vernacularName,
      preferredLanguage,
    );

    if (answerMode === "scientific") {
      return [scientificName];
    }

    if (answerMode === "vernacular") {
      return vernacularName ? [vernacularName] : [scientificName];
    }

    return vernacularName ? [scientificName, vernacularName] : [scientificName];
  };

  const getVernacularName = (targetSpecies: Species) =>
    getLocalizedText(targetSpecies.data.vernacularName, preferredLanguage);

  const setLearningMetricFromProgress = (
    scientificProgress: LearningProgressState | null,
    vernacularProgress: LearningProgressState | null,
    now: Date = new Date(),
  ) => {
    const scientificAccuracy = scientificProgress
      ? estimateRetention(
          scientificProgress,
          now,
          DEFAULT_RETENTION_HORIZON_DAYS,
          "accuracy",
        )
      : null;
    const scientificSpeed = scientificProgress
      ? estimateRetention(
          scientificProgress,
          now,
          DEFAULT_RETENTION_HORIZON_DAYS,
          "speed",
        )
      : null;
    const vernacularAccuracy = vernacularProgress
      ? estimateRetention(
          vernacularProgress,
          now,
          DEFAULT_RETENTION_HORIZON_DAYS,
          "accuracy",
        )
      : null;
    const vernacularSpeed = vernacularProgress
      ? estimateRetention(
          vernacularProgress,
          now,
          DEFAULT_RETENTION_HORIZON_DAYS,
          "speed",
        )
      : null;

    const accuracyScore = combineRetention(
      scientificAccuracy,
      vernacularAccuracy,
    );
    const speedScore = combineRetention(scientificSpeed, vernacularSpeed);
    const combinedScore = combineRetention(accuracyScore, speedScore);

    setLearningMetric({
      label: getLearningStatusLabel(
        combinedScore,
        LEARNING_STATUS_THRESHOLDS,
      ),
      combinedScore,
      accuracyScore,
      speedScore,
    });
  };

  const loadLearningProgressForSpecies = async (speciesId: string) => {
    if (!user) return;

    const [scientific, vernacular] = await Promise.all([
      getLearningProgress(user.uid, speciesId, "scientific"),
      getLearningProgress(user.uid, speciesId, "vernacular"),
    ]);

    const nextProgress = {
      scientific: scientific ?? null,
      vernacular: vernacular ?? null,
    };

    if (scientific) {
      progressCacheRef.current.set(
        buildProgressKey(speciesId, "scientific"),
        scientific,
      );
    }
    if (vernacular) {
      progressCacheRef.current.set(
        buildProgressKey(speciesId, "vernacular"),
        vernacular,
      );
    }

    setCurrentLearningProgress(nextProgress);
    setLearningMetricFromProgress(
      nextProgress.scientific,
      nextProgress.vernacular,
    );
  };

  const flushPendingProgressUpdates = async () => {
    if (!user) return;

    const records = Array.from(pendingProgressRef.current.values());
    if (records.length === 0) return;

    try {
      await upsertLearningProgressBatch(records);
      pendingProgressRef.current.clear();
    } catch (error) {
      logFirestoreError("Failed to update learning progress", error);
    }
  };

  const updateStackHistogram = async () => {
    if (!user) return;
    if (species.length === 0) return;

    try {
      await flushPendingProgressUpdates();
      const speciesIds = species.map((item) => item.id);
      const progressMap = await getLearningProgressForSpeciesIds(
        user.uid,
        speciesIds,
      );
      const now = new Date();
      const scientific = buildStackLearningHistogram(
        speciesIds,
        progressMap,
        "scientific",
        now,
      );
      const vernacular = buildStackLearningHistogram(
        speciesIds,
        progressMap,
        "vernacular",
        now,
      );
      const stored = await upsertStackLearningHistogram({
        userId: user.uid,
        stackId,
        scientific,
        vernacular,
        updatedAt: now,
      });
      setStackHistogram(stored);
    } catch (error) {
      logFirestoreError("Failed to update stack histogram", error);
    }
  };

  const recordLearningProgress = async (
    targetSpecies: Species,
    scoresByType: Partial<
      Record<LearningNameType, LearningScoreUpdate>
    >,
  ) => {
    if (!user) return;
    if (!scoresByType || Object.keys(scoresByType).length === 0) return;

    const now = new Date();
    const nextProgress = {
      scientific:
        currentLearningProgress?.scientific ??
        progressCacheRef.current.get(
          buildProgressKey(targetSpecies.id, "scientific"),
        ) ??
        null,
      vernacular:
        currentLearningProgress?.vernacular ??
        progressCacheRef.current.get(
          buildProgressKey(targetSpecies.id, "vernacular"),
        ) ??
        null,
    };

    for (const [nameType, score] of Object.entries(scoresByType) as [
      LearningNameType,
      LearningScoreUpdate,
    ][]) {
      const key = buildProgressKey(targetSpecies.id, nameType);
      let previous = progressCacheRef.current.get(key) ?? null;

      if (!previous) {
        const stored = await getLearningProgress(
          user.uid,
          targetSpecies.id,
          nameType,
        );
        if (stored) {
          previous = stored;
          progressCacheRef.current.set(key, stored);
        }
      }

      // Use the prior response average when available; fall back to defaults.
      const expectedBaseline =
        previous?.averageResponseMs && previous.averageResponseMs > 0
          ? previous.averageResponseMs
          : score.expectedMs;
      const speedScore = getSpeedScore(
        score.responseMs,
        expectedBaseline,
        score.accuracyScore,
      );
      const updated = updateLearningProgressState(
        previous,
        score.accuracyScore,
        speedScore,
        score.responseMs,
        now,
      );
      progressCacheRef.current.set(key, updated);

      pendingProgressRef.current.set(key, {
        userId: user.uid,
        speciesId: targetSpecies.id,
        nameType,
        ...updated,
      });

      if (nameType === "scientific") {
        nextProgress.scientific = updated;
      } else {
        nextProgress.vernacular = updated;
      }
    }

    setCurrentLearningProgress(nextProgress);
    setLearningMetricFromProgress(
      nextProgress.scientific,
      nextProgress.vernacular,
      now,
    );
  };

  const getLearningScoresForTextAnswer = (
    targetSpecies: Species,
    answerMode: QuizAnswerMode,
    answerText: string,
    responseMs: number,
    expectedMs: number,
  ): Partial<Record<LearningNameType, LearningScoreUpdate>> => {
    const scientificName = targetSpecies.data.scientificName;
    const vernacularName = getVernacularName(targetSpecies);
    const scientificScore = scoreAnswer(answerText, [scientificName]);
    const vernacularScore = vernacularName
      ? scoreAnswer(answerText, [vernacularName])
      : null;

    if (answerMode === "scientific") {
      return {
        scientific: {
          accuracyScore: scientificScore,
          responseMs,
          expectedMs,
        },
      };
    }

    if (answerMode === "vernacular") {
      if (vernacularScore === null) {
        return {
          scientific: {
            accuracyScore: scientificScore,
            responseMs,
            expectedMs,
          },
        };
      }
      return {
        vernacular: {
          accuracyScore: vernacularScore,
          responseMs,
          expectedMs,
        },
      };
    }

    if (vernacularScore === null) {
      return {
        scientific: {
          accuracyScore: scientificScore,
          responseMs,
          expectedMs,
        },
      };
    }

    return {
      scientific: {
        accuracyScore: scientificScore,
        responseMs,
        expectedMs,
      },
      vernacular: {
        accuracyScore: vernacularScore,
        responseMs,
        expectedMs,
      },
    };
  };

  const getLearningScoresForChoice = (
    targetSpecies: Species,
    answerMode: QuizAnswerMode,
    isCorrect: boolean,
    responseMs: number,
    expectedMs: number,
  ): Partial<Record<LearningNameType, LearningScoreUpdate>> => {
    const accuracyScore = isCorrect ? 1 : 0;
    const vernacularName = getVernacularName(targetSpecies);
    const update: LearningScoreUpdate = {
      accuracyScore,
      responseMs,
      expectedMs,
    };

    if (answerMode === "scientific") {
      return { scientific: update };
    }

    if (answerMode === "vernacular") {
      return vernacularName
        ? { vernacular: update }
        : { scientific: update };
    }

    // Feature: we intentionally credit both names to reinforce dual recall.
    return vernacularName
      ? { scientific: update, vernacular: update }
      : { scientific: update };
  };

  const handleTextAnswerSubmit = () => {
    if (answered || !currentQuestion || !quizPreferences) return;

    const acceptedAnswers = getAcceptedAnswers(
      currentQuestion.species,
      quizPreferences.answerMode,
    );
    const score = scoreAnswer(textAnswer, acceptedAnswers);
    const isCorrect = score >= CORRECT_SCORE_THRESHOLD;
    const responseMs = getResponseMs();
    const expectedMs = getExpectedResponseMs("write-name");
    const learningScores = getLearningScoresForTextAnswer(
      currentQuestion.species,
      quizPreferences.answerMode,
      textAnswer,
      responseMs,
      expectedMs,
    );

    if (isCorrect) {
      setAnswered(true);
      setTextAnswerCorrect(true);
      setTextAnswerFeedback(null);
      setCorrectAnswers((previous) => previous + 1);
      void recordLearningProgress(currentQuestion.species, learningScores);
      return;
    }

    if (score >= CLOSE_SCORE_THRESHOLD && !textAnswerRetryUsed) {
      setTextAnswerRetryUsed(true);
      setTextAnswerFeedback("Close! Check the spelling and try again.");
      setTextAnswerCorrect(null);
      textAnswerRef.current?.focus();
      textAnswerRef.current?.select();
      return;
    }

    setAnswered(true);
    setTextAnswerCorrect(false);
    setTextAnswerFeedback(null);
    void recordLearningProgress(currentQuestion.species, learningScores);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setAnswered(false);
      setTextAnswer("");
      setTextAnswerCorrect(null);
      setTextAnswerFeedback(null);
      setTextAnswerRetryUsed(false);
      setLearningMetric(null);
    } else {
      setQuizComplete(true);
      void updateStackHistogram();
    }
  };

  const handleRestart = () => {
    void startQuiz();
  };

  const handlePreferencesChange = async (updates: Partial<QuizPreferences>) => {
    if (!quizPreferences) return;

    const nextPreferences = normalizeQuizPreferences({
      ...quizPreferences,
      ...updates,
    });
    setQuizPreferences(nextPreferences);
    setStoredQuizPreferences(nextPreferences);

    if (!preferencesLoaded || !user) return;

    try {
      await updateUserQuizPreferences(user.uid, nextPreferences);
    } catch (error) {
      logFirestoreError("Failed to save quiz preferences", error);
    }
  };

  const startQuiz = async () => {
    if (!quizPreferences) return;
    await flushPendingProgressUpdates();
    const clampedCount = getQuestionCount(
      quizPreferences.questionCount,
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
    setTextAnswerFeedback(null);
    setTextAnswerRetryUsed(false);
    setLearningMetric(null);
    setShowSettings(false);
    questionStartRef.current = Date.now();
  };

  useEffect(() => {
    if (!user) {
      setCurrentLearningProgress(null);
      setLearningMetric(null);
      return;
    }

    const activeQuestion = questions[currentQuestionIndex];
    if (!activeQuestion) return;

    setCurrentLearningProgress(null);
    setLearningMetric(null);
    void loadLearningProgressForSpecies(activeQuestion.species.id);
  }, [currentQuestionIndex, questions, user?.uid]);

  useEffect(() => {
    if (showSettings || quizComplete) return;
    const activeQuestion = questions[currentQuestionIndex];
    if (!activeQuestion) return;
    questionStartRef.current = Date.now();
  }, [currentQuestionIndex, questions, quizComplete, showSettings]);

  useEffect(() => {
    if (!currentLearningProgress) return;
    setLearningMetricFromProgress(
      currentLearningProgress.scientific,
      currentLearningProgress.vernacular,
    );
  }, [currentLearningProgress]);

  useEffect(() => {
    return () => {
      void flushPendingProgressUpdates();
    };
  }, [user?.uid]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (showSettings) {
        if (event.key === "Enter" && quizPreferences) {
          const maxQuestions = species.length;
          const displayQuestionCount = getQuestionCount(
            quizPreferences.questionCount,
            maxQuestions,
          );
          if (displayQuestionCount >= 2) {
            event.preventDefault();
            void startQuiz();
          }
        }
        return;
      }

      if (quizComplete) {
        if (event.key === "Enter") {
          event.preventDefault();
          handleRestart();
        }
        return;
      }

      if (!quizPreferences || !questions.length) return;

      const isTextMode = quizPreferences.mode === "write-name";
      if (isTextMode) {
        if (event.key === "Enter") {
          event.preventDefault();
          handleTextAnswerSubmit();
        }
      } else {
        if (!answered && ["1", "2", "3", "4"].includes(event.key)) {
          const optionIndex = Number(event.key) - 1;
          const currentQuestion = questions[currentQuestionIndex];
          const option = currentQuestion?.options[optionIndex];
          if (option) {
            event.preventDefault();
            handleAnswerSelect(option);
          }
        }
      }

      if (event.key === "Enter") {
        if (answered) {
          event.preventDefault();
          handleNext();
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    answered,
    currentQuestionIndex,
    handleAnswerSelect,
    handleNext,
    handleRestart,
    handleTextAnswerSubmit,
    quizComplete,
    quizPreferences,
    questions,
    showSettings,
    species.length,
    startQuiz,
  ]);

  useEffect(() => {
    if (showSettings || quizComplete) return;
    if (quizPreferences?.mode !== "write-name") return;
    if (answered || questions.length === 0) return;

    textAnswerRef.current?.focus();
  }, [
    answered,
    questions.length,
    currentQuestionIndex,
    quizComplete,
    quizPreferences?.mode,
    showSettings,
  ]);

  const stackName = stack
    ? getLocalizedText(stack.data.name, preferredLanguage)
    : "Quiz";
  const groupName = group
    ? getLocalizedText(group.data.name, preferredLanguage)
    : getLocalizedText(stack?.data.pinkka?.name, preferredLanguage);

  if (loading) {
    return (
      <LearningSessionShell
        groupName={groupName || "Loading"}
        stackName={stackName}
        progressValue={0}
        exitHref="/"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </LearningSessionShell>
    );
  }

  if (!stack || species.length < 2) {
    return (
      <LearningSessionShell
        groupName={groupName}
        stackName={stackName}
        progressValue={0}
        exitHref="/"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-muted-foreground">
            This stack needs at least 2 species with images to create a quiz.
          </p>
          <Button asChild>
            <Link href="/">Browse Other Stacks</Link>
          </Button>
        </div>
      </LearningSessionShell>
    );
  }

  if (!quizPreferences) {
    return (
      <LearningSessionShell
        groupName={groupName}
        stackName={stackName}
        progressValue={0}
        exitHref="/"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </LearningSessionShell>
    );
  }

  if (showSettings) {
    const maxQuestions = species.length;
    const questionOptions = [10, 25, 50, 0];
    const selectedQuestionCount = questionOptions.includes(
      quizPreferences.questionCount,
    )
      ? quizPreferences.questionCount
      : 10;
    const displayQuestionCount = getQuestionCount(
      selectedQuestionCount,
      maxQuestions,
    );

    const canStartQuiz = displayQuestionCount >= 2;

    return (
      <LearningSessionShell
        groupName={groupName}
        stackName={stackName}
        progressValue={0}
        progressLabel="Quiz settings"
        exitHref="/"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full max-w-3xl">
            <QuizSettingsCard
              questionOptions={questionOptions}
              speciesCount={species.length}
              quizPreferences={quizPreferences}
              canStartQuiz={canStartQuiz}
              onPreferencesChange={handlePreferencesChange}
              onStartQuiz={startQuiz}
            />
          </div>
        </div>
      </LearningSessionShell>
    );
  }

  if (questions.length === 0) {
    return (
      <LearningSessionShell
        groupName={groupName}
        stackName={stackName}
        progressValue={0}
        exitHref="/"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </LearningSessionShell>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const currentVernacularName = getLocalizedText(
    currentQuestion.species.data.vernacularName,
    preferredLanguage,
  );
  const currentDisplayNames = getDisplayNames(
    currentQuestion.species,
    quizPreferences.answerMode,
  );

  if (quizComplete) {
    const percentage = Math.round((correctAnswers / questions.length) * 100);

    return (
      <LearningSessionShell
        groupName={groupName}
        stackName={stackName}
        progressValue={100}
        progressLabel="Completed"
        exitHref="/"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full max-w-3xl">
            <QuizCompletedCard
              percentage={percentage}
              correctAnswers={correctAnswers}
              totalQuestions={questions.length}
              stackId={stackId}
              learningHistogram={stackHistogram}
              onRestart={handleRestart}
            />
          </div>
        </div>
      </LearningSessionShell>
    );
  }

  return (
    <LearningSessionShell
      groupName={groupName}
      stackName={stackName}
      progressValue={progress}
      progressLabel={`Question ${currentQuestionIndex + 1} of ${questions.length}`}
      exitHref="/"
    >
      <div className="relative h-full w-full">
        <div className="absolute inset-x-0 top-0 bottom-16">
          {currentQuestion && (
            <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:grid-rows-1">
              <div className="min-h-0">
                <QuizSpeciesCard imageUrl={currentQuestion.imageUrl} />
              </div>

              <div className="flex h-full min-h-0 flex-col gap-4">
                {quizPreferences.mode === "multiple-choice" ? (
                  <div className="grid h-full min-h-0 auto-rows-fr gap-4 sm:grid-cols-2">
                    {currentQuestion.options.map((option, optionsIndex) => {
                      const displayNames = getDisplayNames(
                        option,
                        quizPreferences.answerMode,
                      );
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
                          className={`h-full text-left justify-start ${
                            showResult && isCorrect ? "bg-primary" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <p className="mr-2 text-lg font-semibold">
                              {optionsIndex + 1}
                            </p>
                            <div className="flex-1">
                              <p className="text-lg font-semibold">
                                {displayNames.primary}
                              </p>
                              {displayNames.secondary && (
                                <p className="text-sm opacity-80">
                                  {displayNames.secondary}
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
                ) : (
                  <div className="flex h-full min-h-0 flex-col gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="text-answer">Species name</Label>
                      <Input
                        id="text-answer"
                        ref={textAnswerRef}
                        value={textAnswer}
                        onChange={(event) => setTextAnswer(event.target.value)}
                        placeholder="Type the species name"
                        disabled={answered}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
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
                      {textAnswerFeedback && !answered && (
                        <p className="text-sm text-primary">
                          {textAnswerFeedback}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleTextAnswerSubmit()}
                      size="lg"
                      disabled={answered}
                      className="mt-auto"
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
                        {textAnswerCorrect ? (
                          <p className="font-semibold">Correct!</p>
                        ) : null}
                        <p className="text-sm text-muted-foreground">
                          Correct answer: {currentDisplayNames.primary}
                          {currentDisplayNames.secondary
                            ? ` (${currentDisplayNames.secondary})`
                            : ""}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {answered && user && learningMetric && (
                  <LearningStatusCard
                    label={learningMetric.label}
                    combinedScore={learningMetric.combinedScore}
                    horizonDays={DEFAULT_RETENTION_HORIZON_DAYS}
                    accuracyScore={learningMetric.accuracyScore}
                    speedScore={learningMetric.speedScore}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {answered && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            <Button onClick={handleNext} size="lg">
              {currentQuestionIndex < questions.length - 1
                ? "Next Question"
                : "Finish Quiz"}
            </Button>
          </div>
        )}
      </div>
    </LearningSessionShell>
  );
}
