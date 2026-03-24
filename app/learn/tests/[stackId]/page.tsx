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
  TestAnswerScope,
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
const ACTIVE_LEARNING_NAME_TYPES: LearningNameType[] = [
  "species",
  "genus",
  "family",
];
const LEGACY_SPECIES_NAME_TYPES: LearningNameType[] = [
  "either",
  "scientific",
  "vernacular",
];
const LEARNING_NAME_TYPES_TO_LOAD: LearningNameType[] = [
  ...ACTIVE_LEARNING_NAME_TYPES,
  ...LEGACY_SPECIES_NAME_TYPES,
];

function normalizeAnswerValue(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase();
}

function createEmptyLearningProgress(): SpeciesLearningProgress {
  return {
    species: null,
    genus: null,
    family: null,
    scientific: null,
    vernacular: null,
    either: null,
  };
}

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

  const getGenusFromScientificName = (scientificName: string) =>
    scientificName.trim().split(/\s+/)[0] ?? scientificName;

  const getTaxonomyScientificName = (
    targetSpecies: Species,
    rank: "MX.genus" | "MX.family",
  ): string | null => {
    const dataWithTaxonomy = targetSpecies.data as Species["data"] & {
      taxonomy?: Array<{
        rank?: string;
        scientificName?: string | null;
      }>;
    };
    const taxonomyEntry = dataWithTaxonomy.taxonomy?.find(
      (entry) => entry.rank === rank,
    );
    const scientificName = taxonomyEntry?.scientificName;
    return scientificName ? scientificName.trim() : null;
  };

  const getGenusName = (targetSpecies: Species) => {
    const directGenus = targetSpecies.data.genusScientificName?.trim();
    if (directGenus) return directGenus;
    return (
      getTaxonomyScientificName(targetSpecies, "MX.genus") ??
      getGenusFromScientificName(targetSpecies.data.scientificName)
    );
  };

  const getFamilyName = (targetSpecies: Species): string | null => {
    const directFamily = targetSpecies.data.familyScientificName?.trim();
    if (directFamily) return directFamily;
    return getTaxonomyScientificName(targetSpecies, "MX.family");
  };

  const getScopePrimaryAnswerValue = (
    targetSpecies: Species,
    answerScope: TestAnswerScope,
  ): string => {
    if (answerScope === "genus") {
      return getGenusName(targetSpecies);
    }

    if (answerScope === "family") {
      return getFamilyName(targetSpecies) ?? targetSpecies.data.scientificName;
    }

    return targetSpecies.data.scientificName;
  };

  const isCorrectOptionForScope = (
    selectedSpecies: Species,
    correctSpecies: Species,
    answerScope: TestAnswerScope,
  ): boolean => {
    if (answerScope === "species") {
      return selectedSpecies.id === correctSpecies.id;
    }

    const selectedAnswer = normalizeAnswerValue(
      getScopePrimaryAnswerValue(selectedSpecies, answerScope),
    );
    const correctAnswer = normalizeAnswerValue(
      getScopePrimaryAnswerValue(correctSpecies, answerScope),
    );

    return selectedAnswer.length > 0 && selectedAnswer === correctAnswer;
  };

  const getScopeProgressScore = (
    targetSpecies: Species,
    answerScope: TestAnswerScope,
    progressMap: Map<string, LearningProgressState>,
    now: Date,
  ): number | null => {
    const getScoreForType = (nameType: LearningNameType) =>
      getLearningScoreFromProgress(
        progressMap.get(buildProgressKey(targetSpecies.id, nameType)) ?? null,
        now,
      );

    if (answerScope === "genus") {
      return getScoreForType("genus");
    }

    if (answerScope === "family") {
      return getScoreForType("family");
    }

    const speciesScore = getScoreForType("species");
    if (speciesScore !== null) return speciesScore;

    const eitherScore = getScoreForType("either");
    if (eitherScore !== null) return eitherScore;

    const scientificScore = getScoreForType("scientific");
    const vernacularScore = getScoreForType("vernacular");
    if (scientificScore === null && vernacularScore === null) return null;
    return combineRetention(scientificScore, vernacularScore);
  };

  const getSpeciesFamiliarityScore = (
    targetSpecies: Species,
    answerScope: TestAnswerScope,
    progressMap: Map<string, LearningProgressState>,
    now: Date,
  ): number | null => {
    return getScopeProgressScore(targetSpecies, answerScope, progressMap, now);
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
    answerScope: TestAnswerScope,
  ) => {
    const testQuestions: TestQuestion[] = [];
    const selectedSpecies = selectSpeciesForTest(
      allSpecies,
      questionCount,
      familiarityBySpeciesId,
    );

    selectedSpecies.forEach((correctSpecies) => {
      const shuffledCandidates = allSpecies
        .filter((item) => item.id !== correctSpecies.id)
        .sort(() => Math.random() - 0.5);

      let wrongOptions: Species[] = [];
      if (answerScope === "species") {
        wrongOptions = shuffledCandidates.slice(0, 3);
      } else {
        const correctAnswer = normalizeAnswerValue(
          getScopePrimaryAnswerValue(correctSpecies, answerScope),
        );
        const distinctDistractors = new Map<string, Species>();
        shuffledCandidates.forEach((candidate) => {
          const candidateAnswer = normalizeAnswerValue(
            getScopePrimaryAnswerValue(candidate, answerScope),
          );
          if (
            !candidateAnswer ||
            candidateAnswer === correctAnswer ||
            distinctDistractors.has(candidateAnswer)
          ) {
            return;
          }
          distinctDistractors.set(candidateAnswer, candidate);
        });
        const uniqueWrongOptions = [...distinctDistractors.values()].slice(
          0,
          3,
        );
        if (uniqueWrongOptions.length < 3) {
          const usedOptionIds = new Set(
            uniqueWrongOptions.map((item) => item.id),
          );
          const fallbackWrongOptions = shuffledCandidates
            .filter((item) => !usedOptionIds.has(item.id))
            .slice(0, 3 - uniqueWrongOptions.length);
          wrongOptions = [...uniqueWrongOptions, ...fallbackWrongOptions];
        } else {
          wrongOptions = uniqueWrongOptions;
        }
      }

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

    const isCorrect = isCorrectOptionForScope(
      answer,
      currentQuestion.correctAnswer,
      testPreferences.answerScope,
    );
    if (isCorrect) {
      setCorrectAnswers((previous) => previous + 1);
    }

    void recordLearningProgress(
      currentQuestion.species,
      getLearningScoresForChoice(
        testPreferences.answerScope,
        isCorrect,
        getResponseMs(),
        getExpectedResponseMs("multiple-choice"),
      ),
    );
  };

  const getDisplayNames = (
    targetSpecies: Species,
    answerScope: TestAnswerScope,
  ) => {
    const scientificName = targetSpecies.data.scientificName;
    const vernacularName = getVernacularName(targetSpecies);
    const genusName = getGenusName(targetSpecies);
    const familyName = getFamilyName(targetSpecies);

    if (answerScope === "genus") {
      return {
        primary: genusName,
        secondary: scientificName,
      };
    }

    if (answerScope === "family") {
      return {
        primary: familyName ?? scientificName,
        secondary: familyName ? scientificName : null,
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
    answerScope: TestAnswerScope,
  ) => {
    const scientificName = targetSpecies.data.scientificName;
    const vernacularName = getVernacularName(targetSpecies);
    const genusName = getGenusName(targetSpecies);
    const familyName = getFamilyName(targetSpecies);

    if (answerScope === "genus") {
      return [genusName];
    }

    if (answerScope === "family") {
      return familyName ? [familyName] : [scientificName];
    }

    return vernacularName ? [scientificName, vernacularName] : [scientificName];
  };

  const setLearningMetricFromProgress = (
    progress: SpeciesLearningProgress,
    answerScope: TestAnswerScope,
    now: Date = new Date(),
  ) => {
    const getRetentionScores = (nameType: LearningNameType) => {
      const progressForType = progress[nameType] ?? null;
      if (!progressForType) {
        return {
          accuracy: null,
          speed: null,
        };
      }

      return {
        accuracy: estimateRetention(
          progressForType,
          now,
          DEFAULT_RETENTION_HORIZON_DAYS,
          "accuracy",
        ),
        speed: estimateRetention(
          progressForType,
          now,
          DEFAULT_RETENTION_HORIZON_DAYS,
          "speed",
        ),
      };
    };

    const speciesScores = getRetentionScores("species");
    const genusScores = getRetentionScores("genus");
    const familyScores = getRetentionScores("family");
    const eitherScores = getRetentionScores("either");
    const scientificScores = getRetentionScores("scientific");
    const vernacularScores = getRetentionScores("vernacular");

    let accuracyScore: number | null = null;
    let speedScore: number | null = null;

    if (answerScope === "genus") {
      accuracyScore = genusScores.accuracy;
      speedScore = genusScores.speed;
    } else if (answerScope === "family") {
      accuracyScore = familyScores.accuracy;
      speedScore = familyScores.speed;
    } else if (
      speciesScores.accuracy !== null ||
      speciesScores.speed !== null
    ) {
      accuracyScore = speciesScores.accuracy;
      speedScore = speciesScores.speed;
    } else if (progress.either) {
      accuracyScore = eitherScores.accuracy;
      speedScore = eitherScores.speed;
    } else {
      // Backward compatibility for records created before species-scope tracking.
      accuracyScore = combineRetention(
        scientificScores.accuracy,
        vernacularScores.accuracy,
      );
      speedScore = combineRetention(
        scientificScores.speed,
        vernacularScores.speed,
      );
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
      const loadedProgress = await Promise.all(
        LEARNING_NAME_TYPES_TO_LOAD.map(async (nameType) => {
          const progress = await getLearningProgress(
            user.uid,
            speciesId,
            nameType,
          );
          return [nameType, progress] as const;
        }),
      );

      const nextProgress = createEmptyLearningProgress();

      loadedProgress.forEach(([nameType, progress]) => {
        nextProgress[nameType] = progress ?? null;
        if (progress) {
          progressCacheRef.current.set(
            buildProgressKey(speciesId, nameType),
            progress,
          );
        }
      });

      setCurrentLearningProgress(nextProgress);
      setLearningMetricFromProgress(
        nextProgress,
        testPreferences?.answerScope ?? "species",
      );
    } catch (error) {
      logFirestoreError("Failed to load learning progress", error);
      setCurrentLearningProgress(createEmptyLearningProgress());
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
      const speciesHistogram = buildStackLearningHistogram(
        speciesIds,
        progressMap,
        "species",
        now,
      );
      const legacySpeciesHistogram = buildStackLearningHistogram(
        speciesIds,
        progressMap,
        "either",
        now,
      );
      const speciesScopeHistogram =
        speciesHistogram.new.count === speciesIds.length &&
        legacySpeciesHistogram.new.count !== speciesIds.length
          ? legacySpeciesHistogram
          : speciesHistogram;
      const genus = buildStackLearningHistogram(
        speciesIds,
        progressMap,
        "genus",
        now,
      );
      const family = buildStackLearningHistogram(
        speciesIds,
        progressMap,
        "family",
        now,
      );
      const stored = await upsertStackLearningHistogram({
        userId: user.uid,
        stackId,
        species: speciesScopeHistogram,
        genus,
        family,
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
      const nextProgress = createEmptyLearningProgress();
      LEARNING_NAME_TYPES_TO_LOAD.forEach((nameType) => {
        nextProgress[nameType] =
          currentLearningProgress?.[nameType] ??
          progressCacheRef.current.get(
            buildProgressKey(targetSpecies.id, nameType),
          ) ??
          null;
      });

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
        testPreferences?.answerScope ?? "species",
        now,
      );
    } catch (error) {
      logFirestoreError("Failed to record learning progress", error);
    }
  };

  const getLearningScoresForTextAnswer = (
    targetSpecies: Species,
    answerScope: TestAnswerScope,
    answerText: string,
    responseMs: number,
    expectedMs: number,
  ): Partial<Record<LearningNameType, LearningScoreUpdate>> => {
    const scientificName = targetSpecies.data.scientificName;
    const vernacularName = getVernacularName(targetSpecies);
    const genusName = getGenusName(targetSpecies);
    const familyName = getFamilyName(targetSpecies);
    const scientificScore = scoreAnswer(answerText, [scientificName]);
    const vernacularScore = vernacularName
      ? scoreAnswer(answerText, [vernacularName])
      : null;
    const genusScore = scoreAnswer(answerText, [genusName]);
    const familyScore = familyName
      ? scoreAnswer(answerText, [familyName])
      : scientificScore;

    if (answerScope === "genus") {
      return {
        genus: {
          accuracyScore: genusScore,
          responseMs,
          expectedMs,
        },
      };
    }

    if (answerScope === "family") {
      return {
        family: {
          accuracyScore: familyScore,
          responseMs,
          expectedMs,
        },
      };
    }

    return {
      species: {
        accuracyScore:
          vernacularScore === null
            ? scientificScore
            : Math.max(scientificScore, vernacularScore),
        responseMs,
        expectedMs,
      },
    };
  };

  const getLearningScoresForChoice = (
    answerScope: TestAnswerScope,
    isCorrect: boolean,
    responseMs: number,
    expectedMs: number,
  ): Partial<Record<LearningNameType, LearningScoreUpdate>> => {
    const accuracyScore = isCorrect ? 1 : 0;
    const update: LearningScoreUpdate = {
      accuracyScore,
      responseMs,
      expectedMs,
    };

    if (answerScope === "genus") {
      return { genus: update };
    }

    if (answerScope === "family") {
      return { family: update };
    }

    return { species: update };
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
      testPreferences.answerScope,
    );
    const score = scoreAnswer(textAnswer, acceptedAnswers);
    const isCorrect = score >= CORRECT_SCORE_THRESHOLD;
    const responseMs = getResponseMs();
    const expectedMs = getExpectedResponseMs("write-name");
    const learningScores = getLearningScoresForTextAnswer(
      currentQuestion.species,
      testPreferences.answerScope,
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
            testPreferences.answerScope,
            progressMap,
            now,
          ),
        );
      });
    }

    generateQuestions(
      species,
      clampedCount,
      familiarityBySpeciesId,
      testPreferences.answerScope,
    );
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
      testPreferences?.answerScope ?? "species",
    );
  }, [currentLearningProgress, testPreferences?.answerScope]);

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
  const currentFamilyName = getFamilyName(currentQuestion.species);
  const currentDisplayNames = getDisplayNames(
    currentQuestion.species,
    testPreferences.answerScope,
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
                          testPreferences.answerScope,
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
                      <Label htmlFor="text-answer">
                        {t("test.answerInput.label")}
                      </Label>
                      <Input
                        id="text-answer"
                        ref={textAnswerRef}
                        value={textAnswer}
                        onChange={(event) => setTextAnswer(event.target.value)}
                        placeholder={t("test.answerInput.placeholder")}
                        disabled={answered}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                      />
                      <p className="text-sm text-muted-foreground">
                        {testPreferences.answerScope === "species" &&
                          t("test.answerHelp.species")}
                        {testPreferences.answerScope === "genus" &&
                          t("test.answerHelp.genus")}
                        {testPreferences.answerScope === "family" &&
                          (currentFamilyName
                            ? t("test.answerHelp.family")
                            : t("test.answerHelp.familyFallback"))}
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
