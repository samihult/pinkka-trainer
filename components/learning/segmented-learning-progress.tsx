"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Species metadata displayed by one segment in the learning progress bar. */
export interface LearningProgressSegment {
  /** Stable id for keying and species navigation. */
  id: string;
  /** Scientific species name shown in the tooltip. */
  scientificName: string;
  /** Optional localized vernacular name shown below scientific name. */
  vernacularName?: string | null;
}

/** Props for the segmented learning progress component. */
export interface SegmentedLearningProgressProps {
  /** Ordered species segments rendered in the progress bar. */
  segments: LearningProgressSegment[];
  /** Zero-based index of the currently active species. */
  activeIndex: number;
  /** Called when a segment reaction area is clicked. */
  onSelectIndex?: (index: number) => void;
  /** Optional class name for outer wrapper styling overrides. */
  className?: string;
}

/** Segmented progress bar with enlarged hover areas and species-name tooltips. */
export function SegmentedLearningProgress({
  segments,
  activeIndex,
  onSelectIndex,
  className,
}: SegmentedLearningProgressProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className={cn("flex w-full flex-wrap items-center gap-1", className)}>
      {segments.map((segment, index) => {
        const isFirst = index === 0;
        const isLast = index === segments.length - 1;
        const isActive = index === activeIndex;
        const isVisited = index <= activeIndex;
        const showTooltip = hoveredIndex === index;
        const tooltipToneClasses = isVisited
          ? "border-primary/80 bg-primary text-primary-foreground"
          : "border-muted-foreground/40 bg-muted text-foreground";

        return (
          <button
            key={segment.id}
            type="button"
            onClick={() => onSelectIndex?.(index)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() =>
              setHoveredIndex((current) => (current === index ? null : current))
            }
            onFocus={() => setHoveredIndex(index)}
            onBlur={() =>
              setHoveredIndex((current) => (current === index ? null : current))
            }
            className={cn(
              "relative flex h-10 min-w-[1.5em] flex-1 basis-0 items-center px-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              onSelectIndex ? "cursor-pointer" : "cursor-default",
            )}
            aria-label={
              segment.vernacularName
                ? `${segment.scientificName}, ${segment.vernacularName}`
                : segment.scientificName
            }
          >
            <span
              aria-hidden
              className={cn(
                "block h-2 w-full transition-colors",
                isActive
                  ? "bg-primary"
                  : isVisited
                    ? "bg-primary/60"
                    : "bg-muted-foreground/35",
                isFirst && isLast && "rounded-full",
                !isFirst && !isLast && "rounded-none",
                isFirst && !isLast && "rounded-l-full rounded-r-sm",
                !isFirst && isLast && "rounded-l-sm rounded-r-full",
              )}
            />
            {showTooltip ? (
              <div
                className={cn(
                  "pointer-events-none absolute left-1/2 top-0 z-20 w-max max-w-[18rem]",
                  "-translate-x-1/2 -translate-y-[calc(100%+0.35rem)] rounded-xl border px-3 py-2 shadow-lg",
                  tooltipToneClasses,
                )}
              >
                <p className="text-sm font-semibold leading-tight italic">
                  {segment.scientificName}
                </p>
                {segment.vernacularName ? (
                  <p className="text-xs leading-tight opacity-90">
                    {segment.vernacularName}
                  </p>
                ) : null}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
