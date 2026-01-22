import type { LearningStatusThresholds } from "@/lib/types";

/** Default thresholds for mapping retention to a learning status label. */
export const LEARNING_STATUS_THRESHOLDS: LearningStatusThresholds = {
  learningMax: 0.3,
  strengtheningMax: 0.95,
};

/**
 * Map a retention score to a verbal label using configured thresholds.
 */
export function getLearningStatusLabel(
  score: number,
  thresholds: LearningStatusThresholds,
): string {
  if (score < thresholds.learningMax) return "Learning";
  if (score <= thresholds.strengtheningMax) return "Strengthening";
  return "Mastered";
}
