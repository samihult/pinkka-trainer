/** Verdant Scholar text atoms centralize editorial typography for reuse across molecules and organisms. */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const verdantScholarTextVariants = cva("", {
  variants: {
    tone: {
      default: "text-[var(--vs-color-on-surface)]",
      muted: "text-[var(--vs-color-on-surface-variant)]",
      primary: "text-[var(--vs-color-primary)]",
      inherit: "text-inherit",
    },
    variant: {
      eyebrow:
        "text-[length:var(--vs-font-label-sm)] [font-family:var(--vs-font-label-family)] font-bold uppercase tracking-[0.22em]",
      label:
        "text-[length:var(--vs-font-label-md)] [font-family:var(--vs-font-label-family)] font-semibold uppercase tracking-[0.16em]",
      body: "text-[length:var(--vs-font-body-md)] leading-6",
      "body-lg": "text-[length:var(--vs-font-body-lg)] leading-7",
      meta: "text-sm leading-6",
      italic: "text-[length:var(--vs-font-body-md)] italic leading-6",
    },
  },
  defaultVariants: {
    tone: "default",
    variant: "body",
  },
});

const verdantScholarHeadingVariants = cva(
  "[font-family:var(--vs-font-display-family)] tracking-tight",
  {
    variants: {
      tone: {
        default: "text-[var(--vs-color-on-surface)]",
        muted: "text-[var(--vs-color-on-surface-variant)]",
        primary: "text-[var(--vs-color-primary)]",
        inherit: "text-inherit",
      },
      variant: {
        display:
          "text-[length:var(--vs-font-display-md)] leading-[0.9] font-extrabold",
        headline:
          "text-[length:var(--vs-font-headline-md)] leading-tight font-bold",
        subheadline:
          "text-[length:var(--vs-font-headline-sm)] leading-tight font-bold",
      },
    },
    defaultVariants: {
      tone: "default",
      variant: "headline",
    },
  },
);

/**
 * Props for Verdant Scholar text atoms.
 * @property asChild Renders styles onto a child element via Radix Slot.
 * @property tone Color treatment.
 * @property variant Typography recipe.
 */
export interface VerdantScholarTextProps
  extends
    React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof verdantScholarTextVariants> {
  asChild?: boolean;
}

/** Shared editorial paragraph, label, and meta text styles. */
export function VerdantScholarText({
  asChild = false,
  className,
  tone,
  variant,
  ...props
}: VerdantScholarTextProps) {
  const Comp = asChild ? Slot : "p";

  return (
    <Comp
      className={cn(verdantScholarTextVariants({ className, tone, variant }))}
      {...props}
    />
  );
}

/**
 * Props for Verdant Scholar heading atoms.
 * @property asChild Renders styles onto a child element via Radix Slot.
 * @property tone Color treatment.
 * @property variant Heading scale.
 */
export interface VerdantScholarHeadingProps
  extends
    React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof verdantScholarHeadingVariants> {
  asChild?: boolean;
}

/** Shared editorial heading styles for section, card, and page titles. */
export function VerdantScholarHeading({
  asChild = false,
  className,
  tone,
  variant,
  ...props
}: VerdantScholarHeadingProps) {
  const Comp = asChild ? Slot : "h2";

  return (
    <Comp
      className={cn(
        verdantScholarHeadingVariants({ className, tone, variant }),
      )}
      {...props}
    />
  );
}
