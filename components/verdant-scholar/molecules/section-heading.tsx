/** Verdant Scholar section-heading molecules provide the editorial hierarchy used across layouts. */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

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
          <p className="text-[length:var(--vs-font-label-sm)] font-semibold uppercase tracking-[0.24em] text-[var(--vs-color-primary)]">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h2 className="text-[length:var(--vs-font-headline-md)] leading-tight text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="max-w-2xl text-[length:var(--vs-font-body-md)] leading-6 text-[var(--vs-color-on-surface-variant)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
