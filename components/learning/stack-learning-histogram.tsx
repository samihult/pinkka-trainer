"use client";

import type { LearningStatusHistogram } from "@/lib/types";

const CATEGORY_COLORS: Record<
  keyof LearningStatusHistogram,
  string
> = {
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
}

/** Render stacked-bar histograms for scientific and vernacular learning. */
export function StackLearningHistogram({
  scientific,
  vernacular,
}: StackLearningHistogramProps) {
  const renderBar = (
    label: string,
    histogram: LearningStatusHistogram,
  ) => (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-muted/40"
        role="img"
        aria-label={buildBarTitle(label, histogram)}
        title={buildBarTitle(label, histogram)}
      >
        {histogram.new.percent > 0 && (
          <span
            className={CATEGORY_COLORS.new}
            style={{ width: `${histogram.new.percent}%` }}
          />
        )}
        {histogram.learning.percent > 0 && (
          <span
            className={CATEGORY_COLORS.learning}
            style={{ width: `${histogram.learning.percent}%` }}
          />
        )}
        {histogram.strengthening.percent > 0 && (
          <span
            className={CATEGORY_COLORS.strengthening}
            style={{ width: `${histogram.strengthening.percent}%` }}
          />
        )}
        {histogram.mastered.percent > 0 && (
          <span
            className={CATEGORY_COLORS.mastered}
            style={{ width: `${histogram.mastered.percent}%` }}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {renderBar("Scientific", scientific)}
      {renderBar("Vernacular", vernacular)}
    </div>
  );
}
