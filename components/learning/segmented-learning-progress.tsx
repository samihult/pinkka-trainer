"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

/** Species metadata displayed by one segment in the learning progress bar. */
export interface LearningProgressSegment {
  /** Stable id for keying and species navigation. */
  id: string;
  /** Scientific species name shown in the hover box. */
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
  /** Whether the hover/focus name box is shown. */
  showNameOverlay?: boolean;
  /** Called when a segment reaction area is clicked. */
  onSelectIndex?: (index: number) => void;
  /** Optional class name for outer wrapper styling overrides. */
  className?: string;
}

type OverlayLayout = {
  left: number;
  top: number;
  width: number;
};

const OVERLAY_HORIZONTAL_MARGIN_LEFT = 8;
const OVERLAY_HORIZONTAL_MARGIN_RIGHT = 10;
const OVERLAY_VERTICAL_GAP = -2;
const DEFAULT_OVERLAY_LAYOUT: OverlayLayout = { left: 0, top: 0, width: 0 };

/** Segmented progress bar with enlarged hit areas and one animated hover name box. */
export function SegmentedLearningProgress({
  segments,
  activeIndex,
  showNameOverlay = true,
  onSelectIndex,
  className,
}: SegmentedLearningProgressProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [touchPointerId, setTouchPointerId] = useState<number | null>(null);
  const [overlayLayout, setOverlayLayout] = useState<OverlayLayout>(
    DEFAULT_OVERLAY_LAYOUT,
  );

  const segmentButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const measureRef = useRef<HTMLDivElement | null>(null);

  const previewSegment =
    previewIndex !== null && previewIndex >= 0 && previewIndex < segments.length
      ? segments[previewIndex]
      : null;

  const updateOverlayLayout = useCallback(() => {
    if (!showNameOverlay || previewIndex === null || !previewSegment) return;

    const segmentButton = segmentButtonRefs.current[previewIndex];
    const measureElement = measureRef.current;
    if (!segmentButton || !measureElement) return;

    const segmentRect = segmentButton.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportMaxWidth = Math.max(
      1,
      viewportWidth -
        OVERLAY_HORIZONTAL_MARGIN_LEFT -
        OVERLAY_HORIZONTAL_MARGIN_RIGHT,
    );
    const previousMeasureWidth = measureElement.style.width;
    measureElement.style.width = "";
    const naturalWidth = Math.ceil(measureElement.scrollWidth);
    const overlayWidth =
      Math.min(naturalWidth, viewportMaxWidth) +
      OVERLAY_HORIZONTAL_MARGIN_RIGHT;
    measureElement.style.width = `${overlayWidth}px`;
    const measuredHeight = Math.ceil(measureElement.offsetHeight);
    measureElement.style.width = previousMeasureWidth;
    if (overlayWidth <= 0 || measuredHeight <= 0) return;

    const halfWidth = overlayWidth / 2;
    const unclampedCenterX = segmentRect.left + segmentRect.width / 2;
    const minCenterX =
      OVERLAY_HORIZONTAL_MARGIN_LEFT / 2 +
      OVERLAY_HORIZONTAL_MARGIN_RIGHT / 2 +
      halfWidth;
    const maxCenterX =
      viewportWidth -
      OVERLAY_HORIZONTAL_MARGIN_LEFT / 2 -
      OVERLAY_HORIZONTAL_MARGIN_RIGHT / 2 -
      halfWidth;
    const centerX = clamp(unclampedCenterX, minCenterX, maxCenterX);
    const top = Math.max(
      OVERLAY_HORIZONTAL_MARGIN_LEFT,
      segmentRect.top - measuredHeight - OVERLAY_VERTICAL_GAP,
    );

    setOverlayLayout((previous) => {
      if (
        approximatelyEqual(previous.left, centerX) &&
        approximatelyEqual(previous.top, top) &&
        approximatelyEqual(previous.width, overlayWidth)
      ) {
        return previous;
      }
      return { left: centerX, top, width: overlayWidth };
    });
  }, [previewIndex, previewSegment, showNameOverlay]);

  useLayoutEffect(() => {
    updateOverlayLayout();
  }, [updateOverlayLayout]);

  useEffect(() => {
    if (!showNameOverlay || previewIndex === null) return;

    const handleViewportChange = () => updateOverlayLayout();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [previewIndex, showNameOverlay, updateOverlayLayout]);

  useEffect(() => {
    if (touchPointerId === null) return;

    const clearTouchPreview = (event: PointerEvent) => {
      if (event.pointerId !== touchPointerId) return;
      setTouchPointerId(null);
      setPreviewIndex(null);
    };

    window.addEventListener("pointerup", clearTouchPreview);
    window.addEventListener("pointercancel", clearTouchPreview);

    return () => {
      window.removeEventListener("pointerup", clearTouchPreview);
      window.removeEventListener("pointercancel", clearTouchPreview);
    };
  }, [touchPointerId]);

  useEffect(() => {
    if (previewIndex === null) return;
    if (previewIndex < segments.length) return;
    setPreviewIndex(null);
  }, [previewIndex, segments.length]);

  const handlePreviewStart = (index: number) => {
    setPreviewIndex(index);
  };

  const handlePreviewEnd = (index: number) => {
    setPreviewIndex((current) => {
      if (touchPointerId !== null) return current;
      return current === index ? null : current;
    });
  };

  const handleTouchMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (touchPointerId === null || event.pointerId !== touchPointerId) return;

    const target = document.elementFromPoint(
      event.clientX,
      event.clientY,
    ) as HTMLElement | null;
    const segmentButton = target?.closest<HTMLButtonElement>(
      "[data-progress-segment-index]",
    );
    if (!segmentButton) return;

    const nextIndex = Number(segmentButton.dataset.progressSegmentIndex);
    if (!Number.isInteger(nextIndex)) return;
    if (nextIndex < 0 || nextIndex >= segments.length) return;
    setPreviewIndex(nextIndex);
  };

  return (
    <div className={cn("relative", className)}>
      {showNameOverlay ? (
        <>
          <div
            aria-hidden
            className={cn(
              "pointer-events-none fixed z-30 -translate-x-1/2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 shadow-sm",
              "whitespace-nowrap",
              "transition-[left,top,width,opacity] duration-180 ease-out",
              previewSegment ? "opacity-100" : "opacity-0",
            )}
            style={{
              left: `${overlayLayout.left}px`,
              top: `${overlayLayout.top}px`,
              width:
                overlayLayout.width > 0
                  ? `${overlayLayout.width}px`
                  : undefined,
            }}
          >
            <p className="text-sm font-semibold leading-tight italic">
              {previewSegment?.scientificName ?? ""}
            </p>
            {previewSegment?.vernacularName ? (
              <p className="text-xs leading-tight text-zinc-600">
                {previewSegment.vernacularName}
              </p>
            ) : null}
          </div>

          <div
            ref={measureRef}
            aria-hidden
            className="pointer-events-none fixed -left-[9999px] -top-[9999px] z-[-1] rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 opacity-0 break-words"
          >
            <p className="text-sm font-semibold leading-tight italic">
              {previewSegment?.scientificName ?? ""}
            </p>
            {previewSegment?.vernacularName ? (
              <p className="text-xs leading-tight text-zinc-600">
                {previewSegment.vernacularName}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      <div
        className="grid w-full grid-cols-[repeat(auto-fit,minmax(1.5em,1fr))] gap-1"
        onPointerMove={handleTouchMove}
      >
        {segments.map((segment, index) => {
          const isFirst = index === 0;
          const isLast = index === segments.length - 1;
          const isActive = index === activeIndex;
          const isVisited = index <= activeIndex;
          const isPreviewed = previewIndex === index;
          const barToneClasses = isActive
            ? "bg-primary"
            : isVisited
              ? "bg-primary/60"
              : "bg-muted-foreground/35";

          const handlePointerDown = (
            event: ReactPointerEvent<HTMLButtonElement>,
          ) => {
            if (event.pointerType === "mouse") return;
            setTouchPointerId(event.pointerId);
            setPreviewIndex(index);
          };

          const handlePointerUp = (
            event: ReactPointerEvent<HTMLButtonElement>,
          ) => {
            if (event.pointerType === "mouse") return;
            if (event.pointerId !== touchPointerId) return;
            setTouchPointerId(null);
            setPreviewIndex(null);
          };

          const handlePointerCancel = (
            event: ReactPointerEvent<HTMLButtonElement>,
          ) => {
            if (event.pointerType === "mouse") return;
            if (event.pointerId !== touchPointerId) return;
            setTouchPointerId(null);
            setPreviewIndex(null);
          };

          return (
            <button
              key={segment.id}
              ref={(element) => {
                segmentButtonRefs.current[index] = element;
              }}
              type="button"
              data-progress-segment-index={index}
              onClick={() => onSelectIndex?.(index)}
              onMouseEnter={() => handlePreviewStart(index)}
              onMouseLeave={() => handlePreviewEnd(index)}
              onFocus={() => handlePreviewStart(index)}
              onBlur={() => handlePreviewEnd(index)}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              className={cn(
                "relative flex h-8 w-full touch-none items-center px-0",
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
                  "block h-2 w-full origin-center transition-[transform,background-color] duration-150 ease-out",
                  barToneClasses,
                  isPreviewed && "scale-y-125",
                  isFirst && isLast && "rounded-full",
                  !isFirst && !isLast && "rounded-none",
                  isFirst && !isLast && "rounded-l-full rounded-r-sm",
                  !isFirst && isLast && "rounded-l-sm rounded-r-full",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  if (min > max) return value;
  return Math.min(Math.max(value, min), max);
}

function approximatelyEqual(first: number, second: number) {
  return Math.abs(first - second) < 0.5;
}
