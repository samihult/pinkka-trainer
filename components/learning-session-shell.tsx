"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/** Props for the learning session shell layout. */
export interface LearningSessionShellProps {
  /** Optional group label shown above the stack name. */
  groupName?: string | null;
  /** Stack name shown as the primary header. */
  stackName: string;
  /** Progress value in the 0-100 range. */
  progressValue: number;
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
  progressLabel,
  headerAction,
  exitHref,
  children,
}: LearningSessionShellProps) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-b from-background to-secondary/20">
      <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-4 sm:inset-x-6 sm:top-6">
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

      <div className="absolute inset-x-4 top-16 sm:inset-x-6 sm:top-20">
        <Progress value={progressValue} className="h-2" />
      </div>

      <div className="absolute inset-x-4 top-24 bottom-4 sm:inset-x-6 sm:top-28 sm:bottom-6">
        {children}
      </div>
    </div>
  );
}
