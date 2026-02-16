"use client";

import { Fragment } from "react";
import { useI18n, type Translate } from "@/lib/i18n";
import type { LearningStatusHistogram } from "@/lib/types";

const CATEGORY_COLORS: Record<keyof LearningStatusHistogram, string> = {
  total: "",
  new: "bg-muted",
  learning: "bg-sky-500",
  strengthening: "bg-amber-500",
  mastered: "bg-emerald-600",
};

function buildBarTitle(
  t: Translate,
  label: string,
  histogram: LearningStatusHistogram,
): string {
  return t("learning.histogram.barTitle", {
    label,
    newPercent: histogram.new.percent,
    learningPercent: histogram.learning.percent,
    strengtheningPercent: histogram.strengthening.percent,
    masteredPercent: histogram.mastered.percent,
  });
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
  const { t } = useI18n();
  const rows = [
    {
      key: "scientific",
      label: t("learning.histogram.label.scientific"),
      histogram: scientific,
    },
    {
      key: "vernacular",
      label: t("learning.histogram.label.vernacular"),
      histogram: vernacular,
    },
    {
      key: "either",
      label: t("learning.histogram.label.either"),
      histogram: either,
    },
  ] as const;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          {t("learning.histogram.mastered")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          {t("learning.histogram.strengthening")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          {t("learning.histogram.learning")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-muted" />
          {t("learning.histogram.new")}
        </span>
      </div>
      <div className="grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-3 gap-y-1">
        {rows.map((row) => (
          <Fragment key={row.key}>
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {row.label}
            </span>
            <div
              className="flex h-2 w-full overflow-hidden rounded-full bg-muted/40"
              role="img"
              aria-label={buildBarTitle(t, row.label, row.histogram)}
              title={buildBarTitle(t, row.label, row.histogram)}
            >
              {row.histogram.mastered.percent > 0 && (
                <span
                  className={CATEGORY_COLORS.mastered}
                  style={{ width: `${row.histogram.mastered.percent}%` }}
                />
              )}
              {row.histogram.strengthening.percent > 0 && (
                <span
                  className={CATEGORY_COLORS.strengthening}
                  style={{ width: `${row.histogram.strengthening.percent}%` }}
                />
              )}
              {row.histogram.learning.percent > 0 && (
                <span
                  className={CATEGORY_COLORS.learning}
                  style={{ width: `${row.histogram.learning.percent}%` }}
                />
              )}
              {row.histogram.new.percent > 0 && (
                <span
                  className={CATEGORY_COLORS.new}
                  style={{ width: `${row.histogram.new.percent}%` }}
                />
              )}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
