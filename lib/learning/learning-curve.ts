import type { LearningProgressState } from "@/lib/types";

const DAY_MS = 1000 * 60 * 60 * 24;
const MIN_STABILITY_DAYS = 0.25;
const MAX_STABILITY_DAYS = 180;
const DEFAULT_STABILITY_DAYS = 0.5;
const SUCCESS_THRESHOLD = 0.85;
const RESPONSE_TIME_SMOOTHING = 0.2;
const MIN_RESPONSE_MS = 300;

/** Default horizon in days for retention estimates. */
export const DEFAULT_RETENTION_HORIZON_DAYS = 7;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function daysBetween(now: Date, previous: Date): number {
  return Math.max(0, (now.getTime() - previous.getTime()) / DAY_MS);
}

/**
 * Estimate current recall probability using an exponential forgetting curve.
 *
 * Inputs required per review:
 * - accuracy score in [0, 1]
 * - response time in milliseconds
 *
 * Minimal stored data per species/name variant:
 * - accuracyStabilityDays: stability for recall accuracy
 * - speedStabilityDays: stability for response speed
 * - averageResponseMs: smoothed response time baseline
 * - lastReviewedAt, reviewCount
 *
 * The forgetting curve uses: retention = exp(-elapsedDays / stabilityDays).
 */
export function estimateRetention(
  progress: LearningProgressState | null,
  now: Date = new Date(),
  horizonDays: number = 0,
  metric: "accuracy" | "speed" = "accuracy",
): number {
  if (!progress) return 0;
  const stabilitySource =
    metric === "accuracy"
      ? progress.accuracyStabilityDays
      : progress.speedStabilityDays;
  const stability = Math.max(MIN_STABILITY_DAYS, stabilitySource);
  const elapsedDays =
    daysBetween(now, progress.lastReviewedAt) + Math.max(0, horizonDays);
  if (elapsedDays === 0) return 1;
  return clamp(Math.exp(-elapsedDays / stability), 0, 1);
}

/**
 * Convert a response time into a speed score in [0, 1], capped by accuracy.
 *
 * The expectedMs input should come from a per-item baseline (EMA) or a
 * default per quiz mode when no prior data exists.
 */
export function getSpeedScore(
  responseMs: number,
  expectedMs: number,
  accuracyScore: number,
): number {
  const safeResponse = Math.max(MIN_RESPONSE_MS, responseMs);
  const safeExpected = Math.max(MIN_RESPONSE_MS, expectedMs);
  const ratio = safeExpected / safeResponse;
  return clamp(clamp(ratio, 0, 1) * clamp(accuracyScore, 0, 1), 0, 1);
}

/**
 * Update the stored learning state using a lightweight stability model.
 */
export function updateLearningProgressState(
  previous: LearningProgressState | null,
  accuracyScore: number,
  speedScore: number,
  responseMs: number,
  now: Date = new Date(),
): LearningProgressState {
  const clampedAccuracy = clamp(accuracyScore, 0, 1);
  const clampedSpeed = clamp(speedScore, 0, 1);
  const safeResponseMs = Math.max(MIN_RESPONSE_MS, responseMs);
  const previousAverage =
    previous?.averageResponseMs && previous.averageResponseMs > 0
      ? previous.averageResponseMs
      : safeResponseMs;
  const nextAverage =
    previousAverage * (1 - RESPONSE_TIME_SMOOTHING) +
    safeResponseMs * RESPONSE_TIME_SMOOTHING;

  const baseAccuracyStability =
    previous?.accuracyStabilityDays ?? DEFAULT_STABILITY_DAYS;
  const baseSpeedStability =
    previous?.speedStabilityDays ?? DEFAULT_STABILITY_DAYS;
  const accuracySuccess = clampedAccuracy >= SUCCESS_THRESHOLD;
  const speedSuccess = clampedSpeed >= SUCCESS_THRESHOLD;

  const accuracyGrowth = accuracySuccess
    ? 1 + 0.6 + clampedAccuracy * 0.8
    : 0.3 + clampedAccuracy * 0.7;
  const speedGrowth = speedSuccess
    ? 1 + 0.4 + clampedSpeed * 0.6
    : 0.3 + clampedSpeed * 0.6;

  const nextAccuracyStability = clamp(
    baseAccuracyStability * accuracyGrowth,
    MIN_STABILITY_DAYS,
    MAX_STABILITY_DAYS,
  );
  const nextSpeedStability = clamp(
    baseSpeedStability * speedGrowth,
    MIN_STABILITY_DAYS,
    MAX_STABILITY_DAYS,
  );

  return {
    accuracyStabilityDays: nextAccuracyStability,
    speedStabilityDays: nextSpeedStability,
    lastReviewedAt: now,
    reviewCount: (previous?.reviewCount ?? 0) + 1,
    averageResponseMs: nextAverage,
  };
}

/**
 * Combine scientific and vernacular retention scores into a single score.
 */
export function combineRetention(
  scientific: number | null,
  vernacular: number | null,
): number {
  if (scientific === null && vernacular === null) return 0;
  if (scientific === null) return vernacular ?? 0;
  if (vernacular === null) return scientific;
  return (scientific + vernacular) / 2;
}
