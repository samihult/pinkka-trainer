/** Verdant Scholar card atoms wrap the shared shadcn card primitives with editorial tokens. */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const verdantScholarCardVariants = cva(
  "gap-0 rounded-[var(--vs-radius-md)] border-0 py-0 shadow-none",
  {
    variants: {
      tone: {
        surface:
          "bg-[var(--vs-color-surface-container-low)] text-[var(--vs-color-on-surface)]",
        lowest:
          "bg-[var(--vs-color-surface-container-lowest)] text-[var(--vs-color-on-surface)]",
        accent:
          "bg-[var(--vs-color-primary)] text-[var(--vs-color-on-primary)]",
        primary:
          "bg-[var(--vs-color-primary-container)] text-[var(--vs-color-on-primary-container)]",
        tertiary:
          "bg-[var(--vs-color-tertiary-container)] text-[var(--vs-color-on-tertiary-container)]",
        soft: "bg-[color:rgba(202,236,188,0.28)] text-[var(--vs-color-on-primary-container)]",
        glass:
          "bg-[image:var(--vs-gradient-glass)] text-[var(--vs-color-on-surface)] shadow-[var(--vs-shadow-ambient)] backdrop-blur-xl",
      },
      spacing: {
        compact: "",
        comfortable: "",
      },
      interactive: {
        true: "transition-transform duration-200 hover:-translate-y-px",
        false: "",
      },
    },
    defaultVariants: {
      tone: "surface",
      spacing: "comfortable",
      interactive: false,
    },
  },
);

/**
 * Props for Verdant Scholar cards.
 * @property interactive Enables subtle hover lift for clickable cards.
 * @property spacing Reserved variant slot for future density adjustments.
 * @property tone Editorial surface treatment.
 */
export interface VerdantScholarCardProps
  extends
    Omit<React.ComponentProps<typeof Card>, "title">,
    VariantProps<typeof verdantScholarCardVariants> {}

/** Generic editorial card surface based on the shared app card primitive. */
export function VerdantScholarCard({
  className,
  interactive,
  spacing,
  tone,
  ...props
}: VerdantScholarCardProps) {
  return (
    <Card
      className={cn(
        verdantScholarCardVariants({ className, interactive, spacing, tone }),
      )}
      {...props}
    />
  );
}

/** Verdant Scholar card header with compact editorial spacing. */
export function VerdantScholarCardHeader({
  className,
  ...props
}: React.ComponentProps<typeof CardHeader>) {
  return <CardHeader className={cn("gap-2 px-6 pt-6", className)} {...props} />;
}

/** Verdant Scholar card title with display typography. */
export function VerdantScholarCardTitle({
  className,
  ...props
}: React.ComponentProps<typeof CardTitle>) {
  return (
    <CardTitle
      className={cn(
        "text-[length:var(--vs-font-headline-sm)] leading-tight [font-family:var(--vs-font-display-family)] font-bold tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

/** Verdant Scholar card description with muted editorial body styling. */
export function VerdantScholarCardDescription({
  className,
  ...props
}: React.ComponentProps<typeof CardDescription>) {
  return (
    <CardDescription
      className={cn(
        "text-[length:var(--vs-font-body-md)] leading-6 text-[var(--vs-color-on-surface-variant)]",
        className,
      )}
      {...props}
    />
  );
}

/** Verdant Scholar card action slot with preserved shared layout behavior. */
export function VerdantScholarCardAction({
  className,
  ...props
}: React.ComponentProps<typeof CardAction>) {
  return <CardAction className={className} {...props} />;
}

/** Verdant Scholar card content region with editorial padding. */
export function VerdantScholarCardContent({
  className,
  ...props
}: React.ComponentProps<typeof CardContent>) {
  return <CardContent className={cn("px-6 pb-6", className)} {...props} />;
}

/** Verdant Scholar card footer with compact, aligned spacing. */
export function VerdantScholarCardFooter({
  className,
  ...props
}: React.ComponentProps<typeof CardFooter>) {
  return <CardFooter className={cn("px-6 pb-6", className)} {...props} />;
}
