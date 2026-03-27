/** Verdant Scholar section-heading molecules provide the editorial hierarchy used across layouts. */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { VerdantScholarHeading, VerdantScholarText } from "../atoms/text";

/**
 * Props for Verdant Scholar section headings.
 * @property action Optional trailing action.
 * @property className Optional wrapper classes.
 * @property description Optional supporting description.
 * @property eyebrow Optional compact pre-title label.
 * @property title Primary heading content.
 */
export interface VerdantScholarSectionHeadingProps {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
}

/** Editorial section heading with eyebrow, display title, and optional action. */
export function VerdantScholarSectionHeading({
  action,
  className,
  description,
  eyebrow,
  title,
}: VerdantScholarSectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="space-y-2">
        {eyebrow ? (
          <VerdantScholarText tone="primary" variant="eyebrow">
            {eyebrow}
          </VerdantScholarText>
        ) : null}
        <div className="space-y-1">
          <VerdantScholarHeading asChild variant="headline">
            <h2>{title}</h2>
          </VerdantScholarHeading>
          {description ? (
            <VerdantScholarText className="max-w-2xl" tone="muted">
              {description}
            </VerdantScholarText>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
