"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  SegmentedLearningProgress,
  type LearningProgressSegment,
} from "@/components/learning/segmented-learning-progress";

/** Props for the learning session shell layout. */
export interface LearningSessionShellProps {
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
  /** Optional callback for segment click navigation. */
  onSelectProgressSegment?: (index: number) => void;
  /** Optional progress label shown in the header. */
  progressLabel?: string;
  /** Optional extra action rendered in the header. */
  headerAction?: ReactNode;
  /** Href for the exit button. */
  exitHref: string;
  /** Main content rendered in the play area. */
  children: ReactNode;
}

/** Fullscreen shell used by cards and test sessions. */
export function LearningSessionShell({
  groupName,
  stackName,
  progressValue,
  progressSegments,
  activeProgressSegmentIndex = 0,
  onSelectProgressSegment,
  progressLabel,
  headerAction,
  exitHref,
  children,
}: LearningSessionShellProps) {
  const hasSegmentedProgress = Boolean(
    progressSegments && progressSegments.length > 0,
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-gradient-to-b from-background to-secondary/20">
      <div className="flex items-start justify-between gap-4 px-4 pt-4 sm:px-6 sm:pt-6">
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

      <div className="px-4 pt-4 sm:px-6 sm:pt-4">
        {hasSegmentedProgress ? (
          <SegmentedLearningProgress
            segments={progressSegments ?? []}
            activeIndex={activeProgressSegmentIndex}
            onSelectIndex={onSelectProgressSegment}
          />
        ) : (
          <Progress value={progressValue} className="h-2" />
        )}
      </div>

      <div className="relative min-h-0 flex-1 px-4 pt-4 pb-4 sm:px-6 sm:pb-6">
        {children}
      </div>
    </div>
  );
}
