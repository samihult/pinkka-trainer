"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/loading-spinner";
import { LearningSessionShell } from "@/components/learning-session-shell";
import { TestCompletedCard } from "@/components/tests/test-completed-card";
import { LearningStatusCard } from "@/components/tests/learning-status-card";
import { TestSettingsCard } from "@/components/tests/test-settings-card";
import { TestSpeciesCard } from "@/components/tests/test-species-card";
import { useAuth } from "@/lib/auth-context";
import {
  getGroup,
  getGroups,
  getLearningProgress,
  getLearningProgressForSpeciesIds,
  getStack,
  getSpecies,
  getUserTestPreferences,
  upsertLearningProgressBatch,
  upsertStackLearningHistogram,
  updateUserTestPreferences,
} from "@/lib/firebase/firestore-helpers";
import type {
  LearningNameType,
  LearningProgress,
  LearningProgressState,
  TestAnswerMode,
  TestPreferences,
  TestMode,
  Stack,
  Species,
  Group,
  StackLearningHistogram,
} from "@/lib/types";
import {
  getLocalizedText,
  getSpeciesImageUrl,
  getSpeciesImagesWithUrls,
} from "@/lib/content/content-display";
import {
  DEFAULT_TEST_PREFERENCES,
  normalizeTestPreferences,
} from "@/lib/tests/test-preferences";
import { scoreAnswer } from "@/lib/tests/scoring";
import { logFirestoreError } from "@/lib/utils";
import { useLanguagePreference } from "@/lib/language-context";
import {
  getStoredTestPreferences,
  setStoredTestPreferences,
  toLanguageCode,
} from "@/lib/local-preferences";
import { useI18n } from "@/lib/i18n";
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

/** Test prompt data for a single question. */
interface TestQuestion {
  /** Species being asked about. */
  species: Species;
  /** Multiple-choice options for the prompt. */
  options: Species[];
  /** Correct answer for grading. */
  correctAnswer: Species;
  /** Image URL chosen for the test prompt. */
  imageUrl: string | null;
  /** Familiarity score (0-1) for this species under active test settings. */
  familiarityScore: number | null;
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

type SpeciesLearningProgress = Record<
  LearningNameType,
  LearningProgressState | null
>;

type SpeciesLearningBand = "well" | "middle" | "low";

const CLOSE_SCORE_THRESHOLD = 0.85;
const CORRECT_SCORE_THRESHOLD = 1.0;
const DEFAULT_EXPECTED_RESPONSE_MS: Record<TestMode, number> = {
  "multiple-choice": 4000,
  "write-name": 9000,
};

/** Test experience for a single stack. */
export default function TestPage() {
  const { language } = useLanguagePreference();
  const { t } = useI18n();
  const preferredLanguage = toLanguageCode(language);
  const params = useParams();
  const stackId = decodeURIComponent(params.stackId as string);
  const searchParams = useSearchParams();
  const requestedGroupId = searchParams.get("groupId");
  const { user } = useAuth();

  const [stack, setStack] = useState<Stack | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<Species | null>(null);
  const [eliminatedOptionIds, setEliminatedOptionIds] = useState<Set<string>>(
    new Set(),
  );
  const [answered, setAnswered] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [testComplete, setTestComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testPreferences, setTestPreferences] =
    useState<TestPreferences | null>(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [currentLearningProgress, setCurrentLearningProgress] =
    useState<SpeciesLearningProgress | null>(null);
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
  const progressCacheRef = useRef(new Map<string, LearningProgressState>());
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
      const stackData = await getStack(stackId);
      const [speciesData, directGroupData, allGroups] = await Promise.all([
        getSpecies(stackId),
        stackData?.parentGroupId
          ? getGroup(stackData.parentGroupId)
          : Promise.resolve(null),
        stackData?.parentGroupId ? Promise.resolve([]) : getGroups(),
      ]);
      const resolvedGroup =
        directGroupData ??
        allGroups.find((candidate) => candidate.stackIds?.includes(stackId)) ??
        null;
      const speciesWithImages = speciesData.filter(
        (item) =>
          getSpeciesImagesWithUrls(item.data, item.testImageIds).length > 0,
      );
      setStack(stackData);
      setGroup(resolvedGroup);
      setSpecies(speciesWithImages);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setEliminatedOptionIds(new Set());
      setAnswered(false);
      setCorrectAnswers(0);
      setTestComplete(false);
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
        ? await getUserTestPreferences(user.uid)
        : null;
      const localTestPreferences = getStoredTestPreferences();
      const normalizedPreferences = normalizeTestPreferences(
        storedPreferences ?? localTestPreferences,
        DEFAULT_TEST_PREFERENCES,
      );
      setTestPreferences(normalizedPreferences);
      setStoredTestPreferences(normalizedPreferences);
      setPreferencesLoaded(true);
    } catch (error) {
      logFirestoreError("Failed to load test data", error);
    } finally {
      setLoading(false);
    }
  };

  const getExpectedResponseMs = (mode: TestMode) =>
    DEFAULT_EXPECTED_RESPONSE_MS[mode];

  const getResponseMs = () => {
    if (!questionStartRef.current) return 0;
    return Math.max(0, Date.now() - questionStartRef.current);
  };

  const pickTestImageUrl = (targetSpecies: Species) => {
    const enabledIds = targetSpecies.testImageIds;
    const candidates = getSpeciesImagesWithUrls(targetSpecies.data, enabledIds);
    if (!candidates || candidates.length === 0) return null;
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    return getSpeciesImageUrl(selected) || null;
  };

  const shuffleSpecies = (items: Species[]) =>
    [...items].sort(() => Math.random() - 0.5);

  const getLearningScoreFromProgress = (
    progress: LearningProgressState | null,
    now: Date,
  ): number | null => {
    if (!progress) return null;

    const accuracy = estimateRetention(
      progress,
      now,
      DEFAULT_RETENTION_HORIZON_DAYS,
      "accuracy",
    );
    const speed = estimateRetention(
      progress,
      now,
      DEFAULT_RETENTION_HORIZON_DAYS,
      "speed",
    );
    return combineRetention(accuracy, speed);
  };

  const getVernacularName = (targetSpecies: Species) =>
    getLocalizedText(targetSpecies.data.vernacularName, preferredLanguage);

  const getSpeciesFamiliarityScore = (
    targetSpecies: Species,
    answerMode: TestAnswerMode,
    progressMap: Map<string, LearningProgressState>,
    now: Date,
  ): number | null => {
    const scientificProgress =
      progressMap.get(buildProgressKey(targetSpecies.id, "scientific")) ?? null;
    const vernacularProgress =
      progressMap.get(buildProgressKey(targetSpecies.id, "vernacular")) ?? null;
    const eitherProgress =
      progressMap.get(buildProgressKey(targetSpecies.id, "either")) ?? null;

    const scientificScore = getLearningScoreFromProgress(
      scientificProgress,
      now,
    );
    const vernacularScore = getLearningScoreFromProgress(
      vernacularProgress,
      now,
    );
    const eitherScore = getLearningScoreFromProgress(eitherProgress, now);
    const hasVernacularName = Boolean(getVernacularName(targetSpecies));

    if (answerMode === "scientific") return scientificScore;
    if (answerMode === "vernacular") {
      return hasVernacularName ? vernacularScore : scientificScore;
    }

    if (eitherScore !== null) return eitherScore;
    if (scientificScore === null && vernacularScore === null) return null;
    return combineRetention(scientificScore, vernacularScore);
  };

  const getSpeciesLearningBand = (
    familiarityScore: number | null,
  ): SpeciesLearningBand => {
    if (familiarityScore === null) return "low";
    if (familiarityScore > LEARNING_STATUS_THRESHOLDS.strengtheningMax) {
      return "well";
    }
    if (familiarityScore >= LEARNING_STATUS_THRESHOLDS.learningMax) {
      return "middle";
    }
    return "low";
  };

  const selectSpeciesForTest = (
    allSpecies: Species[],
    questionCount: number,
    familiarityBySpeciesId: Map<string, number | null>,
  ): Species[] => {
    const total = Math.min(questionCount, allSpecies.length);
    if (total <= 0) return [];

    const byBand: Record<SpeciesLearningBand, Species[]> = {
      well: [],
      middle: [],
      low: [],
    };

    allSpecies.forEach((speciesItem) => {
      const familiarity = familiarityBySpeciesId.get(speciesItem.id) ?? null;
      byBand[getSpeciesLearningBand(familiarity)].push(speciesItem);
    });

    // Intentionally bias selection from well-learned -> middle -> low bands.
    const targetWell = Math.max(1, Math.floor(total * 0.2));
    const targetMiddle = Math.max(1, Math.floor(total * 0.3));
    const selectedWell = shuffleSpecies(byBand.well).slice(0, targetWell);
    const selectedMiddle = shuffleSpecies(byBand.middle).slice(0, targetMiddle);
    const remainingAfterPrimary = Math.max(
      0,
      total - selectedWell.length - selectedMiddle.length,
    );
    const selectedLow = shuffleSpecies(byBand.low).slice(
      0,
      remainingAfterPrimary,
    );

    const selectedById = new Set(
      [...selectedWell, ...selectedMiddle, ...selectedLow].map(
        (item) => item.id,
      ),
    );
    const fallbackPool = [
      ...shuffleSpecies(byBand.middle),
      ...shuffleSpecies(byBand.low),
      ...shuffleSpecies(byBand.well),
    ].filter((item) => !selectedById.has(item.id));
    const remainingSlots =
      total - selectedWell.length - selectedMiddle.length - selectedLow.length;
    const fallback = fallbackPool.slice(0, Math.max(0, remainingSlots));

    return [...selectedWell, ...selectedMiddle, ...selectedLow, ...fallback];
  };

  const generateQuestions = (
    allSpecies: Species[],
    questionCount: number,
    familiarityBySpeciesId: Map<string, number | null>,
  ) => {
    const testQuestions: TestQuestion[] = [];
    const selectedSpecies = selectSpeciesForTest(
      allSpecies,
      questionCount,
      familiarityBySpeciesId,
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

      testQuestions.push({
        species: correctSpecies,
        options,
        correctAnswer: correctSpecies,
        imageUrl: pickTestImageUrl(correctSpecies),
        familiarityScore: familiarityBySpeciesId.get(correctSpecies.id) ?? null,
      });
    });

    setQuestions(testQuestions);
  };

  const handleAnswerSelect = (answer: Species) => {
    if (answered) return;
    if (!currentQuestion || !testPreferences) return;
    if (eliminatedOptionIds.has(answer.id)) return;

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
        testPreferences.answerMode,
        isCorrect,
        getResponseMs(),
        getExpectedResponseMs("multiple-choice"),
      ),
    );
  };

  const getDisplayNames = (
    targetSpecies: Species,
    answerMode: TestAnswerMode,
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

  const handleEliminateHalfOptions = () => {
    if (answered) return;
    const activeQuestion = questions[currentQuestionIndex];
    if (!activeQuestion) return;
    if (eliminatedOptionIds.size > 0) return;

    const wrongOptions = activeQuestion.options.filter(
      (option) => option.id !== activeQuestion.correctAnswer.id,
    );
    const eliminationCount = Math.min(
      Math.floor(activeQuestion.options.length / 2),
      wrongOptions.length,
    );
    if (eliminationCount <= 0) return;

    const eliminated = [...wrongOptions]
      .sort(() => Math.random() - 0.5)
      .slice(0, eliminationCount)
      .map((option) => option.id);
    setEliminatedOptionIds(new Set(eliminated));
  };

  const getAcceptedAnswers = (
    targetSpecies: Species,
    answerMode: TestAnswerMode,
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

  const setLearningMetricFromProgress = (
    progress: SpeciesLearningProgress,
    answerMode: TestAnswerMode,
    now: Date = new Date(),
  ) => {
    const scientificAccuracy = progress.scientific
      ? estimateRetention(
          progress.scientific,
          now,
          DEFAULT_RETENTION_HORIZON_DAYS,
          "accuracy",
        )
      : null;
    const scientificSpeed = progress.scientific
      ? estimateRetention(
          progress.scientific,
          now,
          DEFAULT_RETENTION_HORIZON_DAYS,
          "speed",
        )
      : null;
    const vernacularAccuracy = progress.vernacular
      ? estimateRetention(
          progress.vernacular,
          now,
          DEFAULT_RETENTION_HORIZON_DAYS,
          "accuracy",
        )
      : null;
    const vernacularSpeed = progress.vernacular
      ? estimateRetention(
          progress.vernacular,
          now,
          DEFAULT_RETENTION_HORIZON_DAYS,
          "speed",
        )
      : null;
    const eitherAccuracy = progress.either
      ? estimateRetention(
          progress.either,
          now,
          DEFAULT_RETENTION_HORIZON_DAYS,
          "accuracy",
        )
      : null;
    const eitherSpeed = progress.either
      ? estimateRetention(
          progress.either,
          now,
          DEFAULT_RETENTION_HORIZON_DAYS,
          "speed",
        )
      : null;

    let accuracyScore: number | null = null;
    let speedScore: number | null = null;

    if (answerMode === "scientific") {
      accuracyScore = scientificAccuracy;
      speedScore = scientificSpeed;
    } else if (answerMode === "vernacular") {
      accuracyScore = vernacularAccuracy ?? scientificAccuracy;
      speedScore = vernacularSpeed ?? scientificSpeed;
    } else if (progress.either) {
      accuracyScore = eitherAccuracy;
      speedScore = eitherSpeed;
    } else {
      // Backward compatibility for older records created before "either" tracking.
      accuracyScore = combineRetention(scientificAccuracy, vernacularAccuracy);
      speedScore = combineRetention(scientificSpeed, vernacularSpeed);
    }

    const combinedScore = combineRetention(accuracyScore, speedScore);

    setLearningMetric({
      label: getLearningStatusLabel(combinedScore, LEARNING_STATUS_THRESHOLDS),
      combinedScore,
      accuracyScore,
      speedScore,
    });
  };

  const loadLearningProgressForSpecies = async (speciesId: string) => {
    if (!user) return;
    try {
      const [scientific, vernacular, either] = await Promise.all([
        getLearningProgress(user.uid, speciesId, "scientific"),
        getLearningProgress(user.uid, speciesId, "vernacular"),
        getLearningProgress(user.uid, speciesId, "either"),
      ]);

      const nextProgress: SpeciesLearningProgress = {
        scientific: scientific ?? null,
        vernacular: vernacular ?? null,
        either: either ?? null,
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
      if (either) {
        progressCacheRef.current.set(
          buildProgressKey(speciesId, "either"),
          either,
        );
      }

      setCurrentLearningProgress(nextProgress);
      setLearningMetricFromProgress(
        nextProgress,
        testPreferences?.answerMode ?? "either",
      );
    } catch (error) {
      logFirestoreError("Failed to load learning progress", error);
      setCurrentLearningProgress({
        scientific: null,
        vernacular: null,
        either: null,
      });
      setLearningMetric(null);
    }
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
      const either = buildStackLearningHistogram(
        speciesIds,
        progressMap,
        "either",
        now,
      );
      const stored = await upsertStackLearningHistogram({
        userId: user.uid,
        stackId,
        scientific,
        vernacular,
        either,
        updatedAt: now,
      });
      setStackHistogram(stored);
    } catch (error) {
      logFirestoreError("Failed to update stack histogram", error);
    }
  };

  const recordLearningProgress = async (
    targetSpecies: Species,
    scoresByType: Partial<Record<LearningNameType, LearningScoreUpdate>>,
  ) => {
    if (!user) return;
    if (!scoresByType || Object.keys(scoresByType).length === 0) return;
    try {
      const now = new Date();
      const nextProgress: SpeciesLearningProgress = {
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
        either:
          currentLearningProgress?.either ??
          progressCacheRef.current.get(
            buildProgressKey(targetSpecies.id, "either"),
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
          parentStackId: targetSpecies.parentStackId,
          parentGroupId: targetSpecies.parentGroupId,
          nameType,
          ...updated,
        });

        nextProgress[nameType] = updated;
      }

      setCurrentLearningProgress(nextProgress);
      setLearningMetricFromProgress(
        nextProgress,
        testPreferences?.answerMode ?? "either",
        now,
      );
    } catch (error) {
      logFirestoreError("Failed to record learning progress", error);
    }
  };

  const getLearningScoresForTextAnswer = (
    targetSpecies: Species,
    answerMode: TestAnswerMode,
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
        either: {
          accuracyScore: scientificScore,
          responseMs,
          expectedMs,
        },
      };
    }

    return {
      either: {
        accuracyScore: Math.max(scientificScore, vernacularScore),
        responseMs,
        expectedMs,
      },
    };
  };

  const getLearningScoresForChoice = (
    targetSpecies: Species,
    answerMode: TestAnswerMode,
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
      return vernacularName ? { vernacular: update } : { scientific: update };
    }

    return vernacularName ? { either: update } : { scientific: update };
  };

  const resetActiveQuestionUiState = () => {
    setSelectedAnswer(null);
    setEliminatedOptionIds(new Set());
    setAnswered(false);
    setTextAnswer("");
    setTextAnswerCorrect(null);
    setTextAnswerFeedback(null);
    setTextAnswerRetryUsed(false);
    setLearningMetric(null);
    setCurrentLearningProgress(null);
  };

  const handleTextAnswerSubmit = () => {
    if (answered || !currentQuestion || !testPreferences) return;

    const acceptedAnswers = getAcceptedAnswers(
      currentQuestion.species,
      testPreferences.answerMode,
    );
    const score = scoreAnswer(textAnswer, acceptedAnswers);
    const isCorrect = score >= CORRECT_SCORE_THRESHOLD;
    const responseMs = getResponseMs();
    const expectedMs = getExpectedResponseMs("write-name");
    const learningScores = getLearningScoresForTextAnswer(
      currentQuestion.species,
      testPreferences.answerMode,
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
      resetActiveQuestionUiState();
    } else {
      setTestComplete(true);
      void updateStackHistogram();
    }
  };

  const handleRestart = () => {
    void startTest();
  };

  const handlePreferencesChange = async (updates: Partial<TestPreferences>) => {
    if (!testPreferences) return;

    const nextPreferences = normalizeTestPreferences({
      ...testPreferences,
      ...updates,
    });
    setTestPreferences(nextPreferences);
    setStoredTestPreferences(nextPreferences);

    if (!preferencesLoaded || !user) return;

    try {
      await updateUserTestPreferences(user.uid, nextPreferences);
    } catch (error) {
      logFirestoreError("Failed to save test preferences", error);
    }
  };

  const startTest = async () => {
    if (!testPreferences) return;
    await flushPendingProgressUpdates();
    const clampedCount = getQuestionCount(
      testPreferences.questionCount,
      species.length,
    );

    const familiarityBySpeciesId = new Map<string, number | null>();
    if (user) {
      const now = new Date();
      const progressMap = await getLearningProgressForSpeciesIds(
        user.uid,
        species.map((speciesItem) => speciesItem.id),
      );
      species.forEach((speciesItem) => {
        familiarityBySpeciesId.set(
          speciesItem.id,
          getSpeciesFamiliarityScore(
            speciesItem,
            testPreferences.answerMode,
            progressMap,
            now,
          ),
        );
      });
    }

    generateQuestions(species, clampedCount, familiarityBySpeciesId);
    setCurrentQuestionIndex(0);
    resetActiveQuestionUiState();
    setCorrectAnswers(0);
    setTestComplete(false);
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
    if (showSettings || testComplete) return;
    const activeQuestion = questions[currentQuestionIndex];
    if (!activeQuestion) return;
    questionStartRef.current = Date.now();
  }, [currentQuestionIndex, questions, testComplete, showSettings]);

  useEffect(() => {
    if (!currentLearningProgress) return;
    setLearningMetricFromProgress(
      currentLearningProgress,
      testPreferences?.answerMode ?? "either",
    );
  }, [currentLearningProgress, testPreferences?.answerMode]);

  useEffect(() => {
    return () => {
      void flushPendingProgressUpdates();
    };
  }, [user?.uid]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (showSettings) {
        if (event.key === "Enter" && testPreferences) {
          const maxQuestions = species.length;
          const displayQuestionCount = getQuestionCount(
            testPreferences.questionCount,
            maxQuestions,
          );
          if (displayQuestionCount >= 2) {
            event.preventDefault();
            void startTest();
          }
        }
        return;
      }

      if (testComplete) {
        if (event.key === "Enter") {
          event.preventDefault();
          handleRestart();
        }
        return;
      }

      if (!testPreferences || !questions.length) return;

      const isTextMode = testPreferences.mode === "write-name";
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
          if (option && !eliminatedOptionIds.has(option.id)) {
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
    eliminatedOptionIds,
    handleAnswerSelect,
    handleNext,
    handleRestart,
    handleTextAnswerSubmit,
    testComplete,
    testPreferences,
    questions,
    showSettings,
    species.length,
    startTest,
  ]);

  useEffect(() => {
    if (showSettings || testComplete) return;
    if (testPreferences?.mode !== "write-name") return;
    if (answered || questions.length === 0) return;

    textAnswerRef.current?.focus();
  }, [
    answered,
    questions.length,
    currentQuestionIndex,
    testComplete,
    testPreferences?.mode,
    showSettings,
  ]);

  const stackName = stack
    ? getLocalizedText(stack.data.name, preferredLanguage)
    : "Test";
  const groupName = group
    ? getLocalizedText(group.data.name, preferredLanguage)
    : "";
  const exitGroupId = group?.id ?? requestedGroupId;
  const exitHref = exitGroupId ? `/groups/${exitGroupId}` : "/";

  if (loading) {
    return (
      <LearningSessionShell
        groupName={groupName || "Loading"}
        stackName={stackName}
        progressValue={0}
        exitHref={exitHref}
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
        exitHref={exitHref}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-muted-foreground">
            This stack needs at least 2 species with images to create a test.
          </p>
          <Button asChild>
            <Link href={exitHref}>Browse Other Stacks</Link>
          </Button>
        </div>
      </LearningSessionShell>
    );
  }

  if (!testPreferences) {
    return (
      <LearningSessionShell
        groupName={groupName}
        stackName={stackName}
        progressValue={0}
        exitHref={exitHref}
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
      testPreferences.questionCount,
    )
      ? testPreferences.questionCount
      : 10;
    const displayQuestionCount = getQuestionCount(
      selectedQuestionCount,
      maxQuestions,
    );

    const canStartTest = displayQuestionCount >= 2;

    return (
      <LearningSessionShell
        groupName={groupName}
        stackName={stackName}
        progressValue={0}
        progressLabel="Test settings"
        exitHref={exitHref}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full max-w-3xl">
            <TestSettingsCard
              questionOptions={questionOptions}
              speciesCount={species.length}
              testPreferences={testPreferences}
              canStartTest={canStartTest}
              onPreferencesChange={handlePreferencesChange}
              onStartTest={startTest}
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
        exitHref={exitHref}
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
    testPreferences.answerMode,
  );
  if (testComplete) {
    const percentage = Math.round((correctAnswers / questions.length) * 100);

    return (
      <LearningSessionShell
        groupName={groupName}
        stackName={stackName}
        progressValue={100}
        progressLabel="Completed"
        exitHref={exitHref}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full max-w-3xl">
            <TestCompletedCard
              percentage={percentage}
              correctAnswers={correctAnswers}
              totalQuestions={questions.length}
              stackId={stackId}
              studyHref={
                exitGroupId
                  ? `/learn/cards/${stackId}?groupId=${encodeURIComponent(exitGroupId)}`
                  : `/learn/cards/${stackId}`
              }
              backHref={exitHref}
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
      exitHref={exitHref}
    >
      <div className="relative h-full w-full">
        <div className="absolute inset-x-0 top-0 bottom-16">
          {currentQuestion && (
            <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:grid-rows-1">
              <div className="min-h-0">
                <TestSpeciesCard
                  imageUrl={currentQuestion.imageUrl}
                  familiarityPercent={
                    currentQuestion.familiarityScore === null
                      ? null
                      : Math.round(currentQuestion.familiarityScore * 100)
                  }
                />
              </div>

              <div className="flex h-full min-h-0 flex-col gap-4">
                {testPreferences.mode === "multiple-choice" ? (
                  <div className="flex h-full min-h-0 flex-col gap-3">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleEliminateHalfOptions}
                        disabled={answered || eliminatedOptionIds.size > 0}
                      >
                        {eliminatedOptionIds.size > 0
                          ? t("test.multipleChoice.eliminateHalfUsed")
                          : t("test.multipleChoice.eliminateHalf")}
                      </Button>
                    </div>
                    <div className="grid h-full min-h-0 auto-rows-fr gap-4 sm:grid-cols-2">
                      {currentQuestion.options.map((option, optionsIndex) => {
                        const displayNames = getDisplayNames(
                          option,
                          testPreferences.answerMode,
                        );
                        const isSelected = selectedAnswer?.id === option.id;
                        const isCorrect =
                          option.id === currentQuestion.correctAnswer.id;
                        const showResult = answered;
                        const isEliminated =
                          !showResult && eliminatedOptionIds.has(option.id);

                        let buttonVariant:
                          | "outline"
                          | "default"
                          | "destructive" = "outline";
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
                            disabled={answered || isEliminated}
                            className={`h-full text-left justify-start ${
                              showResult && isCorrect ? "bg-primary" : ""
                            } ${isEliminated ? "opacity-40" : ""}`}
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
                                {isEliminated && (
                                  <p className="text-xs uppercase tracking-wide opacity-80">
                                    {t("test.multipleChoice.eliminated")}
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
                        {testPreferences.answerMode === "scientific" &&
                          "Scientific name required."}
                        {testPreferences.answerMode === "vernacular" &&
                          (currentVernacularName
                            ? "Vernacular name required."
                            : "Vernacular name missing; scientific name accepted.")}
                        {testPreferences.answerMode === "either" &&
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
                : "Finish Test"}
            </Button>
          </div>
        )}
      </div>
    </LearningSessionShell>
  );
}
