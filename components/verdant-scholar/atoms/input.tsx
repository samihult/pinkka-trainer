/** Verdant Scholar search input atom styled as an editorial pill field. */
import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

import { VerdantScholarButton } from "./button";

/**
 * Props for Verdant Scholar inputs.
 * @property actionLabel Optional embedded action button label.
 * @property icon Optional icon shown at the start of the field.
 */
export interface VerdantScholarInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  actionLabel?: string;
  icon?: React.ReactNode;
}

/** Pill-shaped search field used in navigation and hero sections. */
export const VerdantScholarInput = React.forwardRef<
  HTMLInputElement,
  VerdantScholarInputProps
>(function VerdantScholarInput(
  { actionLabel, className, icon, type = "text", ...props },
  ref,
) {
  return (
    <label className="relative flex w-full items-center">
      <span className="pointer-events-none absolute left-6 text-[var(--vs-color-on-surface-variant)]">
        {icon ?? <Search className="size-4" />}
      </span>
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-14 w-full rounded-[var(--vs-radius-pill)] bg-[var(--vs-color-surface-container-highest)] pl-14 pr-4 text-[length:var(--vs-font-body-lg)] text-[var(--vs-color-on-surface)] shadow-[var(--vs-shadow-ambient)] outline-none placeholder:text-[color:rgba(67,73,57,0.65)] focus-visible:bg-[var(--vs-color-surface-container-lowest)] focus-visible:shadow-[var(--vs-shadow-focus)]",
          actionLabel ? "pr-32" : "",
          className,
        )}
        {...props}
      />
      {actionLabel ? (
        <VerdantScholarButton
          className="absolute right-3 top-1/2 -translate-y-1/2"
          size="sm"
          type="button"
        >
          {actionLabel}
        </VerdantScholarButton>
      ) : null}
    </label>
  );
});
