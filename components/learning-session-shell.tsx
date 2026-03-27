"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  VerdantScholarAtmosphereContainer,
  type VerdantScholarAtmosphereVariant,
} from "@/components/verdant-scholar/atoms/atmosphere-container";
import { verdantScholarThemeVariables } from "@/components/verdant-scholar/tokens";
import {
  SegmentedLearningProgress,
  type LearningProgressSegment,
} from "@/components/learning/segmented-learning-progress";

/** Props for the learning session shell layout. */
export interface LearningSessionShellProps {
  /** Visual theme used for shell-level typography and tokens. */
  theme?: "default" | "verdant-scholar";
  /** Layout variant controlling top header/progress vs bottom console. */
  layout?: "default" | "desktop-console" | "desktop";
  /** Optional group label shown above the stack name. */
  groupName?: string | null;
  /** Stack name shown as the primary header. */
  stackName: string;
  /** Progress value in the 0-100 range. */
  progressValue: number;
  /** Optional species segments for segmented progress rendering. */
  progressSegments?: LearningProgressSegment[];
  /** Active segment index for segmented progress rendering. */
  activeProgressSegmentIndex?: number;
  /** Whether segmented progress should show hover/focus name overlays. */
  showProgressSegmentNameOverlay?: boolean;
  /** Optional callback for segment click navigation. */
  onSelectProgressSegment?: (index: number) => void;
  /** Optional progress label shown in the header. */
  progressLabel?: string;
  /** Optional extra action rendered in the header. */
  headerAction?: ReactNode;
  /** Optional left section rendered in the bottom console toolbar. */
  consoleLeft?: ReactNode;
  /** Optional center section rendered in the bottom console toolbar. */
  consoleCenter?: ReactNode;
  /** Optional right section rendered in the bottom console toolbar. */
  consoleRight?: ReactNode;
  /** Optional Verdant Scholar animated atmosphere shown behind the full viewport. */
  backgroundVariant?: VerdantScholarAtmosphereVariant;
  /** Href for the exit button. */
  exitHref: string;
  /** Main content rendered in the play area. */
  children: ReactNode;
}

const verdantScholarGoogleFontImport = `
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@700;800&display=swap");
`;

const verdantScholarStyles = verdantScholarThemeVariables as CSSProperties;

/** Fullscreen shell used by cards and test sessions. */
export function LearningSessionShell({
  theme = "default",
  layout = "default",
  groupName,
  stackName,
  progressValue,
  progressSegments,
  activeProgressSegmentIndex = 0,
  showProgressSegmentNameOverlay = true,
  onSelectProgressSegment,
  progressLabel,
  headerAction,
  consoleLeft,
  consoleCenter,
  consoleRight,
  backgroundVariant,
  exitHref,
  children,
}: LearningSessionShellProps) {
  const isVerdantScholarTheme = theme === "verdant-scholar";
  const usesDesktopConsole = layout === "desktop-console";
  const usesDesktop = layout === "desktop";
  const hasSegmentedProgress = Boolean(
    progressSegments && progressSegments.length > 0,
  );

  return (
    <div
      className={`relative flex h-screen w-screen flex-col overflow-hidden ${
        isVerdantScholarTheme
          ? "bg-[var(--vs-color-background)] text-[var(--vs-color-on-background)] [font-family:var(--vs-font-body-family)]"
          : ""
      }`}
      style={isVerdantScholarTheme ? verdantScholarStyles : undefined}
    >
      {isVerdantScholarTheme ? (
        <style>{verdantScholarGoogleFontImport}</style>
      ) : null}
      {backgroundVariant ? (
        <VerdantScholarAtmosphereContainer
          variant={backgroundVariant}
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-t from-background to-secondary/20" />
      )}
      {!(usesDesktopConsole || usesDesktop) ? (
        <div className="relative z-10 flex items-start justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {groupName || "Study Group"}
            </p>
            <h1 className="truncate text-2xl font-semibold sm:text-3xl">
              {stackName}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {progressLabel ? (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {progressLabel}
              </span>
            ) : null}
            {headerAction}
            <Button variant="ghost" size="icon" asChild>
              <Link href={exitHref} aria-label="Exit session">
                <X className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {!(usesDesktopConsole || usesDesktop) ? (
        <div className="relative z-10 px-4 pt-4 sm:px-6 sm:pt-4">
          {hasSegmentedProgress ? (
            <SegmentedLearningProgress
              segments={progressSegments ?? []}
              activeIndex={activeProgressSegmentIndex}
              showNameOverlay={showProgressSegmentNameOverlay}
              onSelectIndex={onSelectProgressSegment}
            />
          ) : (
            <Progress value={progressValue} className="h-2" />
          )}
        </div>
      ) : null}

      <div
        className={`relative z-10 min-h-0 flex-1 ${
          usesDesktopConsole
            ? "px-3 pt-3 pb-2 sm:px-4 sm:pt-4"
            : "px-4 pt-4 pb-4 sm:px-6 sm:pb-6"
        }`}
      >
        {children}
      </div>

      {usesDesktopConsole ? (
        <div className="relative z-20 w-full border-t border-[color:rgba(67,73,57,0.25)] bg-[color:rgba(252,249,248,0.94)] shadow-[0_-8px_24px_rgba(28,27,27,0.08)] backdrop-blur-sm">
          <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(220px,520px)_minmax(0,1fr)] items-center gap-4 px-3 py-3 sm:px-4">
            <div className="min-w-0">{consoleLeft}</div>
            <div className="w-full justify-center">{consoleCenter}</div>
            <div className="flex min-w-0 justify-end">{consoleRight}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
