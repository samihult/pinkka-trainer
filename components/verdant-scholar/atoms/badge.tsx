/** Verdant Scholar badge atoms for low-profile status and taxonomy labels. */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const verdantScholarBadgeVariants = cva(
  "inline-flex items-center gap-2 rounded-[var(--vs-radius-pill)] px-3 py-1 text-[length:var(--vs-font-label-sm)] [font-family:var(--vs-font-label-family)] font-semibold uppercase tracking-[0.2em]",
  {
    variants: {
      tone: {
        neutral:
          "bg-[color:rgba(252,249,248,0.8)] text-[var(--vs-color-on-surface)] backdrop-blur-xl",
        primary:
          "bg-[var(--vs-color-secondary-container)] text-[var(--vs-color-on-secondary-container)]",
        tertiary:
          "bg-[var(--vs-color-tertiary-container)] text-[var(--vs-color-on-tertiary-container)]",
        success:
          "bg-[color:rgba(202,236,188,0.72)] text-[var(--vs-color-on-secondary-container)]",
        danger:
          "bg-[var(--vs-color-error-container)] text-[var(--vs-color-on-error-container)]",
      },
    },
    defaultVariants: {
      tone: "primary",
    },
  },
);

/**
 * Props for Verdant Scholar badges.
 * @property tone Semantic surface treatment.
 */
export interface VerdantScholarBadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof verdantScholarBadgeVariants> {}

/** Compact status badge used across cards, chips, and floating labels. */
export function VerdantScholarBadge({
  children,
  className,
  tone,
  ...props
}: VerdantScholarBadgeProps) {
  return (
    <div
      className={cn(verdantScholarBadgeVariants({ className, tone }))}
      {...props}
    >
      {children}
    </div>
  );
}
