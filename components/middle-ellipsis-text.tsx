"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type MiddleEllipsisTextProps = {
  text: string;
  className?: string;
  title?: string;
};

type TextSegments = {
  start: string;
  end: string;
};

function getFontValue(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  if (style.font) {
    return style.font;
  }
  return `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize}/${style.lineHeight} ${style.fontFamily}`;
}

export function MiddleEllipsisText({
  text,
  className,
  title,
}: MiddleEllipsisTextProps) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [segments, setSegments] = useState<TextSegments>({
    start: text,
    end: "",
  });

  const measureWidth = useCallback((value: string, font: string) => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const context = canvasRef.current.getContext("2d");
    if (!context) return 0;
    context.font = font;
    return context.measureText(value).width;
  }, []);

  const findMaxLength = useCallback(
    (value: string, maxWidth: number, font: string, fromStart: boolean) => {
      if (maxWidth <= 0) return 1;
      let low = 1;
      let high = value.length;
      let best = 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const slice = fromStart
          ? value.slice(0, mid)
          : value.slice(value.length - mid);
        const width = measureWidth(slice, font);
        if (width <= maxWidth) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      return best;
    },
    [measureWidth],
  );

  const updateSegments = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    const availableWidth = element.clientWidth;
    if (!availableWidth) return;

    const font = getFontValue(element);
    const fullWidth = measureWidth(text, font);
    if (fullWidth <= availableWidth) {
      setIsTruncated(false);
      setSegments({ start: text, end: "" });
      return;
    }

    const ellipsisWidth = measureWidth("...", font);
    const sideWidth = Math.max(0, (availableWidth - ellipsisWidth) / 2);

    let startLength = findMaxLength(text, sideWidth, font, true);
    let endLength = findMaxLength(text, sideWidth, font, false);

    if (startLength + endLength >= text.length) {
      startLength = Math.max(1, Math.ceil(text.length / 2));
      endLength = Math.max(1, text.length - startLength);
    }

    setIsTruncated(true);
    setSegments({
      start: text.slice(0, startLength),
      end: text.slice(text.length - endLength),
    });
  }, [findMaxLength, measureWidth, text]);

  useLayoutEffect(() => {
    updateSegments();
  }, [updateSegments]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      updateSegments();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [updateSegments]);

  return (
    <span
      ref={containerRef}
      title={title ?? text}
      className={cn(
        "inline-flex min-w-[8em] w-full items-center justify-between gap-0 overflow-hidden",
        className,
      )}
    >
      {isTruncated ? (
        <>
          <span className="min-w-0 grow-0 overflow-hidden whitespace-nowrap text-left">
            {segments.start}
          </span>
          <span className="inline-flex grow-1 shrink-0 justify-around text-muted-foreground">
            <span className="flex-0">.</span>
            <span className="flex-0">.</span>
            <span className="flex-0">.</span>
          </span>
          <span className="min-w-0 grow-0 overflow-hidden whitespace-nowrap text-right">
            {segments.end}
          </span>
        </>
      ) : (
        <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left">
          {text}
        </span>
      )}
    </span>
  );
}
