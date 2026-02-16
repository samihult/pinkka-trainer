import type {
  LearningNameType,
  LearningProgressState,
  LearningStatusCategory,
  LearningStatusHistogram,
} from "@/lib/types";
import {
  DEFAULT_RETENTION_HORIZON_DAYS,
  combineRetention,
  estimateRetention,
} from "@/lib/learning/learning-curve";
import { LEARNING_STATUS_THRESHOLDS } from "@/lib/learning/learning-thresholds";

const STATUS_CATEGORIES: LearningStatusCategory[] = [
  "new",
  "learning",
  "strengthening",
  "mastered",
];

function getCategory(score: number | null): LearningStatusCategory {
  if (score === null) return "new";
  if (score < LEARNING_STATUS_THRESHOLDS.learningMax) return "learning";
  if (score <= LEARNING_STATUS_THRESHOLDS.strengtheningMax) {
    return "strengthening";
  }
  return "mastered";
}

function toHistogramPercentages(
  counts: Record<LearningStatusCategory, number>,
  total: number,
): Record<LearningStatusCategory, number> {
  if (total === 0) {
    return { new: 0, learning: 0, strengthening: 0, mastered: 0 };
  }

  const raw = STATUS_CATEGORIES.map((category) => ({
    category,
    value: (counts[category] / total) * 100,
  }));
  const floored = raw.map((entry) => ({
    category: entry.category,
    value: Math.floor(entry.value),
    remainder: entry.value - Math.floor(entry.value),
  }));
  const used = floored.reduce((sum, entry) => sum + entry.value, 0);
  let remaining = 100 - used;
  const byRemainder = [...floored].sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < byRemainder.length && remaining > 0; i += 1) {
    byRemainder[i].value += 1;
    remaining -= 1;
  }

  const percentByCategory = {
    new: 0,
    learning: 0,
    strengthening: 0,
    mastered: 0,
  };

  for (const entry of byRemainder) {
    percentByCategory[entry.category] = entry.value;
  }

  return percentByCategory;
}

/**
 * Build a learning-status histogram for a stack and name variant.
 */
export function buildStackLearningHistogram(
  speciesIds: string[],
  progressByKey: Map<string, LearningProgressState>,
  nameType: LearningNameType,
  now: Date = new Date(),
  horizonDays: number = DEFAULT_RETENTION_HORIZON_DAYS,
): LearningStatusHistogram {
  const counts: Record<LearningStatusCategory, number> = {
    new: 0,
    learning: 0,
    strengthening: 0,
    mastered: 0,
  };

  speciesIds.forEach((speciesId) => {
    const key = `${speciesId}_${nameType}`;
    const progress = progressByKey.get(key) ?? null;
    const accuracy = progress
      ? estimateRetention(progress, now, horizonDays, "accuracy")
      : null;
    const speed = progress
      ? estimateRetention(progress, now, horizonDays, "speed")
      : null;
    const score = progress ? combineRetention(accuracy, speed) : null;
    const category = getCategory(score);
    counts[category] += 1;
  });

  const total = speciesIds.length;
  const percents = toHistogramPercentages(counts, total);

  return {
    total,
    new: { count: counts.new, percent: percents.new },
    learning: { count: counts.learning, percent: percents.learning },
    strengthening: {
      count: counts.strengthening,
      percent: percents.strengthening,
    },
    mastered: { count: counts.mastered, percent: percents.mastered },
  };
}
