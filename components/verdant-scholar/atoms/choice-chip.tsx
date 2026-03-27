/** Verdant Scholar choice chips provide reusable token-based segmented controls and filter pills. */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const verdantScholarChoiceChipVariants = cva(
  "h-auto rounded-[var(--vs-radius-xs)] px-3 py-1.5 text-[length:var(--vs-font-label-md)] [font-family:var(--vs-font-label-family)] font-semibold shadow-none transition-colors focus-visible:ring-0 focus-visible:shadow-[var(--vs-shadow-focus)]",
  {
    variants: {
      selected: {
        true: "bg-[var(--vs-color-secondary-container)] text-[var(--vs-color-on-secondary-container)] hover:bg-[var(--vs-color-secondary-container)]",
        false:
          "bg-[var(--vs-color-surface-container)] text-[var(--vs-color-on-surface)] hover:bg-[var(--vs-color-surface-container-highest)]",
      },
    },
    defaultVariants: {
      selected: false,
    },
  },
);

/**
 * Props for Verdant Scholar choice chips.
 * @property selected Whether the chip is currently active.
 */
export interface VerdantScholarChoiceChipProps
  extends
    Omit<React.ComponentProps<typeof Button>, "size" | "variant">,
    VariantProps<typeof verdantScholarChoiceChipVariants> {}

/** Compact toggle-like chip built on the shared app button primitive. */
export function VerdantScholarChoiceChip({
  children,
  className,
  selected,
  ...props
}: VerdantScholarChoiceChipProps) {
  return (
    <Button
      aria-pressed={selected ?? false}
      className={cn(verdantScholarChoiceChipVariants({ className, selected }))}
      size="sm"
      variant="secondary"
      {...props}
    >
      {children}
    </Button>
  );
}
