/** Verdant Scholar button atoms follow the Stitch editorial CTA treatments. */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const verdantScholarButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--vs-radius-xl)] [font-family:var(--vs-font-label-family)] text-sm font-bold tracking-wide transition-all duration-200 outline-none focus-visible:shadow-[var(--vs-shadow-focus)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[image:var(--vs-gradient-primary)] text-[var(--vs-color-on-primary)] hover:scale-[1.02]",
        secondary:
          "bg-[var(--vs-color-surface-container-highest)] text-[var(--vs-color-on-surface)] hover:bg-[var(--vs-color-surface-variant)]",
        ghost:
          "rounded-none bg-transparent px-0 text-[var(--vs-color-on-surface)] underline-offset-8 hover:underline",
      },
      size: {
        sm: "h-10 px-4 text-xs",
        md: "h-11 px-5",
        lg: "h-12 px-7 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

/**
 * Props for Verdant Scholar buttons.
 * @property leadingIcon Optional content shown before the label.
 * @property trailingIcon Optional content shown after the label.
 * @property size Button size.
 * @property variant Visual button style.
 */
export interface VerdantScholarButtonProps
  extends
    Omit<React.ComponentProps<typeof Button>, "size" | "variant">,
    VariantProps<typeof verdantScholarButtonVariants> {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

/** Editorial CTA button with gradient, tonal, and ghost treatments. */
export function VerdantScholarButton({
  children,
  className,
  leadingIcon,
  size,
  trailingIcon,
  variant,
  ...props
}: VerdantScholarButtonProps) {
  return (
    <Button
      className={cn(verdantScholarButtonVariants({ className, size, variant }))}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </Button>
  );
}
