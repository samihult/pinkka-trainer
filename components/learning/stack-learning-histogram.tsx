"use client";

import type { LearningStatusHistogram } from "@/lib/types";

const CATEGORY_COLORS: Record<keyof LearningStatusHistogram, string> = {
  total: "",
  new: "bg-muted",
  learning: "bg-sky-500",
  strengthening: "bg-amber-500",
  mastered: "bg-emerald-600",
};

function buildBarTitle(
  label: string,
  histogram: LearningStatusHistogram,
): string {
  return `${label}: New ${histogram.new.percent}%, Learning ${histogram.learning.percent}%, Strengthening ${histogram.strengthening.percent}%, Mastered ${histogram.mastered.percent}%`;
}

/** Props for the StackLearningHistogram component. */
export interface StackLearningHistogramProps {
  /** Scientific name histogram. */
  scientific: LearningStatusHistogram;
  /** Vernacular name histogram. */
  vernacular: LearningStatusHistogram;
  /** Scientific-or-vernacular histogram. */
  either: LearningStatusHistogram;
}

/** Render stacked-bar histograms for scientific, vernacular, and either learning. */
export function StackLearningHistogram({
  scientific,
  vernacular,
  either,
}: StackLearningHistogramProps) {
  const renderBar = (label: string, histogram: LearningStatusHistogram) => (
    <div className="flex items-center gap-3">
      <span className="w-40 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-muted/40"
        role="img"
        aria-label={buildBarTitle(label, histogram)}
        title={buildBarTitle(label, histogram)}
      >
        {histogram.mastered.percent > 0 && (
          <span
            className={CATEGORY_COLORS.mastered}
            style={{ width: `${histogram.mastered.percent}%` }}
          />
        )}
        {histogram.strengthening.percent > 0 && (
          <span
            className={CATEGORY_COLORS.strengthening}
            style={{ width: `${histogram.strengthening.percent}%` }}
          />
        )}
        {histogram.learning.percent > 0 && (
          <span
            className={CATEGORY_COLORS.learning}
            style={{ width: `${histogram.learning.percent}%` }}
          />
        )}
        {histogram.new.percent > 0 && (
          <span
            className={CATEGORY_COLORS.new}
            style={{ width: `${histogram.new.percent}%` }}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          Mastered
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Strengthening
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          Learning
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-muted" />
          New
        </span>
      </div>
      <div>
        {renderBar("Scientific", scientific)}
        {renderBar("Vernacular", vernacular)}
        {renderBar("Scientific or vernacular", either)}
      </div>
    </div>
  );
}
