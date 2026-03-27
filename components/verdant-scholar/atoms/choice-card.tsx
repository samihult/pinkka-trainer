/** Verdant Scholar choice cards provide selectable list and tile surfaces on top of the shared button primitive. */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { VerdantScholarText } from "./text";

const verdantScholarChoiceCardVariants = cva(
  "h-auto w-full justify-start whitespace-normal rounded-[var(--vs-radius-sm)] px-5 py-4 text-left shadow-none transition-colors focus-visible:ring-0 focus-visible:shadow-[var(--vs-shadow-focus)]",
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
 * Props for Verdant Scholar choice cards.
 * @property description Optional supporting copy.
 * @property leading Optional leading content.
 * @property selected Whether the card is currently active.
 * @property title Primary text.
 * @property trailing Optional trailing content.
 */
export interface VerdantScholarChoiceCardProps
  extends
    Omit<React.ComponentProps<typeof Button>, "size" | "title" | "variant">,
    VariantProps<typeof verdantScholarChoiceCardVariants> {
  description?: React.ReactNode;
  leading?: React.ReactNode;
  title: React.ReactNode;
  trailing?: React.ReactNode;
}

/** Selectable row or tile surface used by filters, answers, and test setup options. */
export function VerdantScholarChoiceCard({
  className,
  description,
  leading,
  selected,
  title,
  trailing,
  ...props
}: VerdantScholarChoiceCardProps) {
  return (
    <Button
      aria-pressed={selected ?? false}
      className={cn(verdantScholarChoiceCardVariants({ className, selected }))}
      size="default"
      variant="secondary"
      {...props}
    >
      {leading ? (
        <span className="shrink-0 self-start pt-0.5">{leading}</span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-left font-semibold">{title}</span>
        {description ? (
          <VerdantScholarText
            asChild
            className="mt-1 block text-left"
            tone="muted"
            variant="meta"
          >
            <span>{description}</span>
          </VerdantScholarText>
        ) : null}
      </span>
      {trailing ? (
        <span className="shrink-0 self-start">{trailing}</span>
      ) : null}
    </Button>
  );
}
