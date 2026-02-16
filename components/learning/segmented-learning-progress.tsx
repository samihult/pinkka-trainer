"use client";

import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Species metadata displayed by one segment in the learning progress bar. */
export interface LearningProgressSegment {
  /** Stable id for keying and species navigation. */
  id: string;
  /** Scientific species name shown in the zoomed segment overlay. */
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

/** Segmented progress bar with enlarged hover areas and zoomed segment overlays. */
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
        return (
          <SegmentProgressItem
            key={segment.id}
            index={index}
            segment={segment}
            isFirst={index === 0}
            isLast={index === segments.length - 1}
            isActive={index === activeIndex}
            isVisited={index <= activeIndex}
            isHovered={hoveredIndex === index}
            onHoverStart={() => setHoveredIndex(index)}
            onHoverEnd={() =>
              setHoveredIndex((current) => (current === index ? null : current))
            }
            onSelectIndex={onSelectIndex}
          />
        );
      })}
    </div>
  );
}

type SegmentProgressItemProps = {
  index: number;
  segment: LearningProgressSegment;
  isFirst: boolean;
  isLast: boolean;
  isActive: boolean;
  isVisited: boolean;
  isHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onSelectIndex?: (index: number) => void;
};

type SegmentPopupMetrics = {
  scaleX: number;
  scaleY: number;
  clipX: number;
  clipY: number;
};

const DEFAULT_POPUP_METRICS: SegmentPopupMetrics = {
  scaleX: 1,
  scaleY: 1,
  clipX: 0,
  clipY: 0,
};

function SegmentProgressItem({
  index,
  segment,
  isFirst,
  isLast,
  isActive,
  isVisited,
  isHovered,
  onHoverStart,
  onHoverEnd,
  onSelectIndex,
}: SegmentProgressItemProps) {
  const barRef = useRef<HTMLSpanElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [popupMetrics, setPopupMetrics] = useState<SegmentPopupMetrics>(
    DEFAULT_POPUP_METRICS,
  );

  useLayoutEffect(() => {
    const barElement = barRef.current;
    const popupElement = popupRef.current;
    if (!barElement || !popupElement) return;

    const recalculatePopupMetrics = () => {
      const segmentRect = barElement.getBoundingClientRect();
      const popupWidth = popupElement.offsetWidth;
      const popupHeight = popupElement.offsetHeight;
      if (popupWidth <= 0 || popupHeight <= 0) return;

      const nextMetrics: SegmentPopupMetrics = {
        scaleX: Math.max(0.05, segmentRect.width / popupWidth),
        scaleY: Math.max(0.05, segmentRect.height / popupHeight),
        clipX: Math.max(0, (popupWidth - segmentRect.width) / 2),
        clipY: Math.max(0, (popupHeight - segmentRect.height) / 2),
      };

      setPopupMetrics((previous) =>
        areSegmentPopupMetricsEqual(previous, nextMetrics)
          ? previous
          : nextMetrics,
      );
    };

    recalculatePopupMetrics();

    const resizeObserver = new ResizeObserver(recalculatePopupMetrics);
    resizeObserver.observe(barElement);
    resizeObserver.observe(popupElement);

    return () => resizeObserver.disconnect();
  }, [segment.scientificName, segment.vernacularName]);

  const barToneClasses = isActive
    ? "bg-primary"
    : isVisited
      ? "bg-primary/60"
      : "bg-muted-foreground/35";
  const popupToneClasses = isVisited
    ? "bg-primary text-primary-foreground"
    : "bg-muted text-foreground";

  const restingTransform = `translate(-50%, -50%) scale(${popupMetrics.scaleX}, ${popupMetrics.scaleY})`;
  const expandedTransform = "translate(-50%, calc(-50% - 0.2rem)) scale(1, 1)";
  const restingClipPath = `inset(${popupMetrics.clipY}px ${popupMetrics.clipX}px ${popupMetrics.clipY}px ${popupMetrics.clipX}px round 9999px)`;
  const expandedClipPath = "inset(0px 0px 0px 0px round 0.75rem)";
  const popupStyle: CSSProperties = {
    transform: isHovered ? expandedTransform : restingTransform,
    clipPath: isHovered ? expandedClipPath : restingClipPath,
  };

  return (
    <button
      type="button"
      onClick={() => onSelectIndex?.(index)}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
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
        ref={barRef}
        aria-hidden
        className={cn(
          "block h-2 w-full transition-colors",
          barToneClasses,
          isFirst && isLast && "rounded-full",
          !isFirst && !isLast && "rounded-none",
          isFirst && !isLast && "rounded-l-full rounded-r-sm",
          !isFirst && isLast && "rounded-l-sm rounded-r-full",
        )}
      />

      <div
        ref={popupRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 z-20 w-max max-w-[18rem] px-3 py-2 shadow-lg",
          "transition-[transform,clip-path,opacity] duration-100 ease-out ease-in",
          popupToneClasses,
          isHovered ? "opacity-100" : "opacity-0",
        )}
        style={popupStyle}
      >
        <p
          className={cn(
            "text-sm font-semibold leading-tight italic transition-opacity duration-150",
            isHovered ? "opacity-100" : "opacity-0",
          )}
        >
          {segment.scientificName}
        </p>
        {segment.vernacularName ? (
          <p
            className={cn(
              "text-xs leading-tight transition-opacity duration-150",
              isHovered ? "opacity-90" : "opacity-0",
            )}
          >
            {segment.vernacularName}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function areSegmentPopupMetricsEqual(
  previous: SegmentPopupMetrics,
  next: SegmentPopupMetrics,
) {
  const EPSILON = 0.001;
  return (
    Math.abs(previous.scaleX - next.scaleX) < EPSILON &&
    Math.abs(previous.scaleY - next.scaleY) < EPSILON &&
    Math.abs(previous.clipX - next.clipX) < EPSILON &&
    Math.abs(previous.clipY - next.clipY) < EPSILON
  );
}
