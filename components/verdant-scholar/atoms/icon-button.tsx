/** Verdant Scholar icon-button atoms cover nav actions, toolbars, and compact controls. */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const verdantScholarIconButtonVariants = cva(
  "inline-flex items-center justify-center transition-all duration-200 outline-none focus-visible:shadow-[var(--vs-shadow-focus)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      tone: {
        ghost:
          "rounded-full bg-transparent text-[var(--vs-color-primary)] hover:bg-[color:rgba(63,106,0,0.08)]",
        surface:
          "rounded-full bg-[var(--vs-color-surface-container-highest)] text-[var(--vs-color-on-surface)] hover:bg-[var(--vs-color-surface-variant)]",
        primaryFixedDim:
          "rounded-[var(--vs-radius-md)] bg-[var(--vs-color-primary-fixed-dim)] text-[var(--vs-color-on-primary-container)]",
        toolbar:
          "rounded-[var(--vs-radius-md)] bg-[var(--vs-color-surface-container-highest)] text-[var(--vs-color-on-surface-variant)] hover:bg-[var(--vs-color-surface-container)]",
        activeToolbar:
          "rounded-[var(--vs-radius-md)] bg-[var(--vs-color-primary)] text-[var(--vs-color-on-primary)]",
      },
      size: {
        sm: "size-9",
        md: "size-10",
        lg: "size-12",
      },
    },
    defaultVariants: {
      tone: "ghost",
      size: "md",
    },
  },
);

/**
 * Props for Verdant Scholar icon buttons.
 * @property size Square button size.
 * @property tone Visual treatment for the button surface.
 */
export interface VerdantScholarIconButtonProps
  extends
    Omit<React.ComponentProps<typeof Button>, "size" | "variant">,
    VariantProps<typeof verdantScholarIconButtonVariants> {}

/** Compact icon-only button used throughout the Verdant Scholar library. */
export function VerdantScholarIconButton({
  children,
  className,
  size,
  tone,
  type = "button",
  ...props
}: VerdantScholarIconButtonProps) {
  return (
    <Button
      className={cn(
        verdantScholarIconButtonVariants({ className, size, tone }),
      )}
      type={type}
      {...props}
    >
      {children}
    </Button>
  );
}
