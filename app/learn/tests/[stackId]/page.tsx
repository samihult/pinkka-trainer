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
  TestAnswerNameMode,
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

function dedupeAnswerValues(
  values: Array<string | null | undefined>,
): string[] {
  const dedupedByNormalized = new Map<string, string>();
  for (const value of values) {
    const trimmedValue = value?.trim();
    if (!trimmedValue) continue;
    const normalized = normalizeAnswerValue(trimmedValue);
    if (!normalized || dedupedByNormalized.has(normalized)) continue;
    dedupedByNormalized.set(normalized, trimmedValue);
  }
  return [...dedupedByNormalized.values()];
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

  const trimOrNull = (value: string | null | undefined): string | null => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };

  const getVernacularName = (targetSpecies: Species) =>
    getLocalizedText(targetSpecies.data.vernacularName, preferredLanguage);

  const getTaxonomyEntry = (
    targetSpecies: Species,
    rank: "MX.genus" | "MX.family",
  ) => {
    return (
      targetSpecies.data.taxonomy?.find((entry) => entry.rank === rank) ?? null
    );
  };

  const getScopeNameVariantValues = (
    targetSpecies: Species,
    answerScope: TestAnswerScope,
  ): {
    scientific: string | null;
    vernacular: string | null;
  } => {
    if (answerScope === "species") {
      return {
        scientific: trimOrNull(targetSpecies.data.scientificName),
        vernacular: trimOrNull(getVernacularName(targetSpecies)),
      };
    }

    const taxonomyEntry = getTaxonomyEntry(
      targetSpecies,
      answerScope === "genus" ? "MX.genus" : "MX.family",
    );
    const taxonomyScientific = trimOrNull(taxonomyEntry?.scientificName);
    if (!taxonomyScientific) {
      return {
        scientific: null,
        vernacular: null,
      };
    }

    return {
      scientific: taxonomyScientific,
      vernacular: trimOrNull(
        getLocalizedText(
          taxonomyEntry?.vernacularName ?? undefined,
          preferredLanguage,
        ),
      ),
    };
  };

  const getAcceptedAnswers = (
    targetSpecies: Species,
    answerScope: TestAnswerScope,
    answerNameMode: TestAnswerNameMode,
  ): string[] => {
    const variants = getScopeNameVariantValues(targetSpecies, answerScope);
    if (answerNameMode === "scientific") {
      return dedupeAnswerValues([variants.scientific]);
    }
    if (answerNameMode === "vernacular") {
      return dedupeAnswerValues([variants.vernacular]);
    }
    return dedupeAnswerValues([variants.scientific, variants.vernacular]);
  };

  const getPrimaryAnswerValue = (
    targetSpecies: Species,
    answerScope: TestAnswerScope,
    answerNameMode: TestAnswerNameMode,
  ): string | null => {
    const variants = getScopeNameVariantValues(targetSpecies, answerScope);
    if (answerNameMode === "scientific") {
      return variants.scientific;
    }
    if (answerNameMode === "vernacular") {
      return variants.vernacular;
    }
    return variants.scientific ?? variants.vernacular;
  };

  const getSecondaryAnswerValue = (
    targetSpecies: Species,
    answerScope: TestAnswerScope,
    answerNameMode: TestAnswerNameMode,
  ): string | null => {
    const variants = getScopeNameVariantValues(targetSpecies, answerScope);
    if (answerNameMode === "scientific") {
      return variants.vernacular;
    }
    if (answerNameMode === "vernacular") {
      return variants.scientific;
    }
    if (answerScope === "genus") {
      return variants.vernacular;
    }
    return variants.scientific && variants.vernacular
      ? variants.vernacular
      : null;
  };

  const getNormalizedAnswerSet = (
    targetSpecies: Species,
    answerScope: TestAnswerScope,
    answerNameMode: TestAnswerNameMode,
  ) =>
    new Set(
      getAcceptedAnswers(targetSpecies, answerScope, answerNameMode).map(
        (answer) => normalizeAnswerValue(answer),
      ),
    );

  const doAnswerSetsOverlap = (
    left: Set<string>,
    right: Set<string>,
  ): boolean => {
    for (const answer of left) {
      if (right.has(answer)) return true;
    }
    return false;
  };

  const isSpeciesEligibleForPreferences = (
    targetSpecies: Species,
    answerScope: TestAnswerScope,
    answerNameMode: TestAnswerNameMode,
  ): boolean =>
    getAcceptedAnswers(targetSpecies, answerScope, answerNameMode).length > 0;

  const countDistinctDistractorAnswers = (
    targetSpecies: Species,
    allSpecies: Species[],
    answerScope: TestAnswerScope,
    answerNameMode: TestAnswerNameMode,
  ): number => {
    const correctAnswerSet = getNormalizedAnswerSet(
      targetSpecies,
      answerScope,
      answerNameMode,
    );
    const distinctDistractors = new Set<string>();
    for (const candidate of allSpecies) {
      if (candidate.id === targetSpecies.id) continue;
      const candidateAnswerSet = getNormalizedAnswerSet(
        candidate,
        answerScope,
        answerNameMode,
      );
      if (
        candidateAnswerSet.size === 0 ||
        doAnswerSetsOverlap(candidateAnswerSet, correctAnswerSet)
      ) {
        continue;
      }
      const candidatePrimary = normalizeAnswerValue(
        getPrimaryAnswerValue(candidate, answerScope, answerNameMode),
      );
      if (candidatePrimary) {
        distinctDistractors.add(candidatePrimary);
      }
    }
    return distinctDistractors.size;
  };

  const isCorrectOptionForScope = (
    selectedSpecies: Species,
    correctSpecies: Species,
    answerScope: TestAnswerScope,
    answerNameMode: TestAnswerNameMode,
  ): boolean => {
    const selectedAnswerSet = getNormalizedAnswerSet(
      selectedSpecies,
      answerScope,
      answerNameMode,
    );
    const correctAnswerSet = getNormalizedAnswerSet(
      correctSpecies,
      answerScope,
      answerNameMode,
    );
    return doAnswerSetsOverlap(selectedAnswerSet, correctAnswerSet);
  };

  const getScopeProgressScore = (
    targetSpecies: Species,
    answerScope: TestAnswerScope,
    answerNameMode: TestAnswerNameMode,
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
    const eitherScore = getScoreForType("either");
    const scientificScore = getScoreForType("scientific");
    const vernacularScore = getScoreForType("vernacular");

    if (answerNameMode === "scientific") {
      return (
        scientificScore ??
        speciesScore ??
        eitherScore ??
        combineRetention(scientificScore, vernacularScore)
      );
    }

    if (answerNameMode === "vernacular") {
      return (
        vernacularScore ??
        speciesScore ??
        eitherScore ??
        combineRetention(scientificScore, vernacularScore)
      );
    }

    if (speciesScore !== null) return speciesScore;
    if (eitherScore !== null) return eitherScore;
    if (scientificScore === null && vernacularScore === null) return null;
    return combineRetention(scientificScore, vernacularScore);
  };

  const getSpeciesFamiliarityScore = (
    targetSpecies: Species,
    answerScope: TestAnswerScope,
    answerNameMode: TestAnswerNameMode,
    progressMap: Map<string, LearningProgressState>,
    now: Date,
  ): number | null => {
    return getScopeProgressScore(
      targetSpecies,
      answerScope,
      answerNameMode,
      progressMap,
      now,
    );
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
    answerNameMode: TestAnswerNameMode,
    mode: TestMode,
  ): TestQuestion[] => {
    const testQuestions: TestQuestion[] = [];
    const selectedSpecies = selectSpeciesForTest(
      allSpecies,
      questionCount,
      familiarityBySpeciesId,
    );

    selectedSpecies.forEach((correctSpecies) => {
      const shuffledCandidates = shuffleSpecies(
        allSpecies.filter((item) => item.id !== correctSpecies.id),
      );
      const correctAnswerSet = getNormalizedAnswerSet(
        correctSpecies,
        answerScope,
        answerNameMode,
      );

      if (mode === "multiple-choice") {
        const distinctDistractors = new Map<string, Species>();
        shuffledCandidates.forEach((candidate) => {
          const candidateAnswerSet = getNormalizedAnswerSet(
            candidate,
            answerScope,
            answerNameMode,
          );
          if (
            candidateAnswerSet.size === 0 ||
            doAnswerSetsOverlap(candidateAnswerSet, correctAnswerSet)
          ) {
            return;
          }
          const candidatePrimary = normalizeAnswerValue(
            getPrimaryAnswerValue(candidate, answerScope, answerNameMode),
          );
          if (!candidatePrimary || distinctDistractors.has(candidatePrimary)) {
            return;
          }
          distinctDistractors.set(candidatePrimary, candidate);
        });

        const wrongOptions = [...distinctDistractors.values()].slice(0, 3);
        if (wrongOptions.length < 3) {
          return;
        }

        const options = [...wrongOptions, correctSpecies].sort(
          () => Math.random() - 0.5,
        );
        testQuestions.push({
          species: correctSpecies,
          options,
          correctAnswer: correctSpecies,
          imageUrl: pickTestImageUrl(correctSpecies),
          familiarityScore:
            familiarityBySpeciesId.get(correctSpecies.id) ?? null,
        });
        return;
      }

      testQuestions.push({
        species: correctSpecies,
        options: [correctSpecies],
        correctAnswer: correctSpecies,
        imageUrl: pickTestImageUrl(correctSpecies),
        familiarityScore: familiarityBySpeciesId.get(correctSpecies.id) ?? null,
      });
    });

    return testQuestions;
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
      testPreferences.answerNameMode,
    );
    if (isCorrect) {
      setCorrectAnswers((previous) => previous + 1);
    }

    void recordLearningProgress(
      currentQuestion.species,
      getLearningScoresForChoice(
        testPreferences.answerScope,
        testPreferences.answerNameMode,
        isCorrect,
        getResponseMs(),
        getExpectedResponseMs("multiple-choice"),
      ),
    );
  };

  const getDisplayNames = (
    targetSpecies: Species,
    answerScope: TestAnswerScope,
    answerNameMode: TestAnswerNameMode,
  ) => {
    const primary = getPrimaryAnswerValue(
      targetSpecies,
      answerScope,
      answerNameMode,
    );
    const secondary = getSecondaryAnswerValue(
      targetSpecies,
      answerScope,
      answerNameMode,
    );

    return {
      primary: primary ?? "",
      secondary,
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

  const setLearningMetricFromProgress = (
    progress: SpeciesLearningProgress,
    answerScope: TestAnswerScope,
    answerNameMode: TestAnswerNameMode,
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
    } else {
      const legacyCombinedAccuracy = combineRetention(
        scientificScores.accuracy,
        vernacularScores.accuracy,
      );
      const legacyCombinedSpeed = combineRetention(
        scientificScores.speed,
        vernacularScores.speed,
      );

      if (answerNameMode === "scientific") {
        accuracyScore =
          scientificScores.accuracy ??
          speciesScores.accuracy ??
          eitherScores.accuracy ??
          legacyCombinedAccuracy;
        speedScore =
          scientificScores.speed ??
          speciesScores.speed ??
          eitherScores.speed ??
          legacyCombinedSpeed;
      } else if (answerNameMode === "vernacular") {
        accuracyScore =
          vernacularScores.accuracy ??
          speciesScores.accuracy ??
          eitherScores.accuracy ??
          legacyCombinedAccuracy;
        speedScore =
          vernacularScores.speed ??
          speciesScores.speed ??
          eitherScores.speed ??
          legacyCombinedSpeed;
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
        accuracyScore = legacyCombinedAccuracy;
        speedScore = legacyCombinedSpeed;
      }
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
        testPreferences?.answerNameMode ?? "either",
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
        testPreferences?.answerNameMode ?? "either",
        now,
      );
    } catch (error) {
      logFirestoreError("Failed to record learning progress", error);
    }
  };

  const getLearningScoresForTextAnswer = (
    targetSpecies: Species,
    answerScope: TestAnswerScope,
    answerNameMode: TestAnswerNameMode,
    answerText: string,
    responseMs: number,
    expectedMs: number,
  ): Partial<Record<LearningNameType, LearningScoreUpdate>> => {
    const acceptedAnswers = getAcceptedAnswers(
      targetSpecies,
      answerScope,
      answerNameMode,
    );
    const scopedScore = scoreAnswer(answerText, acceptedAnswers);

    if (answerScope === "genus") {
      return {
        genus: {
          accuracyScore: scopedScore,
          responseMs,
          expectedMs,
        },
      };
    }

    if (answerScope === "family") {
      return {
        family: {
          accuracyScore: scopedScore,
          responseMs,
          expectedMs,
        },
      };
    }
    const speciesUpdate: LearningScoreUpdate = {
      accuracyScore: scopedScore,
      responseMs,
      expectedMs,
    };
    if (answerNameMode === "scientific") {
      return { species: speciesUpdate, scientific: speciesUpdate };
    }
    if (answerNameMode === "vernacular") {
      return { species: speciesUpdate, vernacular: speciesUpdate };
    }
    return { species: speciesUpdate, either: speciesUpdate };
  };

  const getLearningScoresForChoice = (
    answerScope: TestAnswerScope,
    answerNameMode: TestAnswerNameMode,
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

    if (answerNameMode === "scientific") {
      return { species: update, scientific: update };
    }
    if (answerNameMode === "vernacular") {
      return { species: update, vernacular: update };
    }
    return { species: update, either: update };
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
      testPreferences.answerNameMode,
    );
    const score = scoreAnswer(textAnswer, acceptedAnswers);
    const isCorrect = score >= CORRECT_SCORE_THRESHOLD;
    const responseMs = getResponseMs();
    const expectedMs = getExpectedResponseMs("write-name");
    const learningScores = getLearningScoresForTextAnswer(
      currentQuestion.species,
      testPreferences.answerScope,
      testPreferences.answerNameMode,
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
      setTextAnswerFeedback(t("test.answerInput.closeGuess"));
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

  const eligibleSpeciesForPreferences = testPreferences
    ? species.filter((speciesItem) =>
        isSpeciesEligibleForPreferences(
          speciesItem,
          testPreferences.answerScope,
          testPreferences.answerNameMode,
        ),
      )
    : [];

  const questionEligibleSpecies = !testPreferences
    ? []
    : testPreferences.mode === "write-name"
      ? eligibleSpeciesForPreferences
      : eligibleSpeciesForPreferences.filter(
          (speciesItem) =>
            countDistinctDistractorAnswers(
              speciesItem,
              eligibleSpeciesForPreferences,
              testPreferences.answerScope,
              testPreferences.answerNameMode,
            ) >= 3,
        );

  const startTest = async () => {
    if (!testPreferences) return;
    if (questionEligibleSpecies.length < 2) {
      setShowSettings(true);
      return;
    }

    await flushPendingProgressUpdates();
    const clampedCount = getQuestionCount(
      testPreferences.questionCount,
      questionEligibleSpecies.length,
    );

    const familiarityBySpeciesId = new Map<string, number | null>();
    if (user) {
      const now = new Date();
      const progressMap = await getLearningProgressForSpeciesIds(
        user.uid,
        questionEligibleSpecies.map((speciesItem) => speciesItem.id),
      );
      questionEligibleSpecies.forEach((speciesItem) => {
        familiarityBySpeciesId.set(
          speciesItem.id,
          getSpeciesFamiliarityScore(
            speciesItem,
            testPreferences.answerScope,
            testPreferences.answerNameMode,
            progressMap,
            now,
          ),
        );
      });
    }

    const generatedQuestions = generateQuestions(
      questionEligibleSpecies,
      clampedCount,
      familiarityBySpeciesId,
      testPreferences.answerScope,
      testPreferences.answerNameMode,
      testPreferences.mode,
    );
    if (generatedQuestions.length < 2) {
      setShowSettings(true);
      return;
    }

    setQuestions(generatedQuestions);
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
      testPreferences?.answerNameMode ?? "either",
    );
  }, [
    currentLearningProgress,
    testPreferences?.answerScope,
    testPreferences?.answerNameMode,
  ]);

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
          const maxQuestions = questionEligibleSpecies.length;
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
    questionEligibleSpecies.length,
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
    : t("test.fallback.stackName");
  const groupName = group
    ? getLocalizedText(group.data.name, preferredLanguage)
    : "";
  const exitGroupId = group?.id ?? requestedGroupId;
  const exitHref = exitGroupId ? `/groups/${exitGroupId}` : "/";
  const sessionBackgroundVariant = undefined;

  const getScopeLabel = (scope: TestAnswerScope): string => {
    if (scope === "genus") return t("test.scope.short.genus");
    if (scope === "family") return t("test.scope.short.family");
    return t("test.scope.short.species");
  };

  const getNameModeLabel = (mode: TestAnswerNameMode): string => {
    if (mode === "scientific") return t("test.nameMode.short.scientific");
    if (mode === "vernacular") return t("test.nameMode.short.vernacular");
    return t("test.nameMode.short.either");
  };

  const getScopeHelpKey = (scope: TestAnswerScope) => {
    if (scope === "genus") return "test.answerHelp.scope.genus" as const;
    if (scope === "family") return "test.answerHelp.scope.family" as const;
    return "test.answerHelp.scope.species" as const;
  };

  const getNameModeHelpKey = (mode: TestAnswerNameMode) => {
    if (mode === "scientific")
      return "test.answerHelp.nameMode.scientific" as const;
    if (mode === "vernacular")
      return "test.answerHelp.nameMode.vernacular" as const;
    return "test.answerHelp.nameMode.either" as const;
  };

  const getQuestionPrompt = (
    answerScope: TestAnswerScope,
    answerNameMode: TestAnswerNameMode,
  ) =>
    t("test.species.prompt", {
      scope: getScopeLabel(answerScope),
      nameMode: getNameModeLabel(answerNameMode),
    });

  if (loading) {
    return (
      <LearningSessionShell
        groupName={groupName || t("test.fallback.loadingGroup")}
        stackName={stackName}
        progressValue={0}
        theme="verdant-scholar"
        layout="desktop"
        backgroundVariant={sessionBackgroundVariant}
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
        theme="verdant-scholar"
        layout="desktop"
        backgroundVariant={sessionBackgroundVariant}
        exitHref={exitHref}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-muted-foreground">
            {t("test.validation.needsTwoSpecies")}
          </p>
          <Button asChild>
            <Link href={exitHref}>
              {t("test.validation.browseOtherStacks")}
            </Link>
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
        theme="verdant-scholar"
        layout="desktop"
        backgroundVariant={sessionBackgroundVariant}
        exitHref={exitHref}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </LearningSessionShell>
    );
  }

  if (showSettings) {
    const maxQuestions = questionEligibleSpecies.length;
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
    const unavailableReason = canStartTest
      ? null
      : t("test.settings.notEnoughEligible", {
          scope: getScopeLabel(testPreferences.answerScope),
          nameMode: getNameModeLabel(testPreferences.answerNameMode),
        });

    const exitGroupId = group?.id ?? requestedGroupId;
    const exitHref = exitGroupId ? `/groups/${exitGroupId}` : "/";

    return (
      <LearningSessionShell
        groupName={groupName}
        stackName={stackName}
        progressValue={0}
        progressLabel={t("test.progress.settings")}
        theme="verdant-scholar"
        layout="desktop"
        backgroundVariant={sessionBackgroundVariant}
        exitHref={exitHref}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full max-w-3xl">
            <TestSettingsCard
              questionOptions={questionOptions}
              speciesCount={questionEligibleSpecies.length}
              totalSpeciesCount={species.length}
              testPreferences={testPreferences}
              canStartTest={canStartTest}
              unavailableReason={unavailableReason}
              onPreferencesChange={handlePreferencesChange}
              onStartTest={startTest}
              exitHref={exitHref}
              groupName={groupName}
              stackName={stackName}
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
        backgroundVariant={sessionBackgroundVariant}
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
  const currentDisplayNames = getDisplayNames(
    currentQuestion.species,
    testPreferences.answerScope,
    testPreferences.answerNameMode,
  );
  if (testComplete) {
    const percentage = Math.round((correctAnswers / questions.length) * 100);

    return (
      <LearningSessionShell
        groupName={groupName}
        stackName={stackName}
        progressValue={100}
        progressLabel={t("test.progress.completed")}
        backgroundVariant={sessionBackgroundVariant}
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
      progressLabel={t("test.progress.question", {
        current: currentQuestionIndex + 1,
        total: questions.length,
      })}
      backgroundVariant={sessionBackgroundVariant}
      exitHref={exitHref}
    >
      <div className="relative h-full w-full">
        <div className="absolute inset-x-0 top-0 bottom-16">
          {currentQuestion && (
            <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:grid-rows-1">
              <div className="min-h-0">
                <TestSpeciesCard
                  imageUrl={currentQuestion.imageUrl}
                  prompt={getQuestionPrompt(
                    testPreferences.answerScope,
                    testPreferences.answerNameMode,
                  )}
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
                          testPreferences.answerNameMode,
                        );
                        const isSelected = selectedAnswer?.id === option.id;
                        const isCorrect = isCorrectOptionForScope(
                          option,
                          currentQuestion.correctAnswer,
                          testPreferences.answerScope,
                          testPreferences.answerNameMode,
                        );
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
                        {t(getScopeHelpKey(testPreferences.answerScope))}{" "}
                        {t(getNameModeHelpKey(testPreferences.answerNameMode))}
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
                      {t("test.answerInput.submit")}
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
                          <p className="font-semibold">
                            {t("test.answerInput.correct")}
                          </p>
                        ) : null}
                        <p className="text-sm text-muted-foreground">
                          {t("test.answerInput.correctAnswerPrefix")}{" "}
                          {currentDisplayNames.primary}
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
                ? t("test.navigation.nextQuestion")
                : t("test.navigation.finishTest")}
            </Button>
          </div>
        )}
      </div>
    </LearningSessionShell>
  );
}
