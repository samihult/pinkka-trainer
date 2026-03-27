/** Verdant Scholar answer options model the multiple-choice states from the assessment screen. */
import type { MouseEventHandler } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

import { VerdantScholarChoiceCard } from "../atoms/choice-card";

/**
 * Props for Verdant Scholar answer options.
 * @property className Optional wrapper classes.
 * @property label Primary answer text.
 * @property onSelect Optional click handler that makes the row interactive.
 * @property optionKey Letter or short key shown at the start.
 * @property state Visual state for the answer.
 * @property suffix Optional trailing helper label.
 */
export interface VerdantScholarAnswerOptionProps {
  className?: string;
  label: string;
  onSelect?: MouseEventHandler<HTMLButtonElement>;
  optionKey: string;
  state?: "default" | "correct" | "incorrect";
  suffix?: string;
}

const stateClasses: Record<
  NonNullable<VerdantScholarAnswerOptionProps["state"]>,
  string
> = {
  default:
    "bg-[var(--vs-color-surface-container-low)] text-[var(--vs-color-on-surface)]",
  correct:
    "bg-[var(--vs-color-surface-container-lowest)] text-[var(--vs-color-on-surface)] shadow-[inset_0_0_0_2px_rgba(63,106,0,0.6)]",
  incorrect:
    "bg-[var(--vs-color-surface-container-lowest)] text-[var(--vs-color-on-surface)] shadow-[inset_0_0_0_2px_rgba(186,26,26,0.55)]",
};

/** Multiple-choice answer row with explicit correct and incorrect treatments. */
export function VerdantScholarAnswerOption({
  className,
  label,
  onSelect,
  optionKey,
  state = "default",
  suffix,
}: VerdantScholarAnswerOptionProps) {
  const leading = (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
        state === "correct"
          ? "bg-[var(--vs-color-primary)] text-[var(--vs-color-on-primary)]"
          : state === "incorrect"
            ? "bg-[color:rgba(186,26,26,0.1)] text-[var(--vs-color-error)]"
            : "bg-[color:rgba(28,27,27,0.06)] text-[var(--vs-color-on-surface-variant)]",
      )}
    >
      {optionKey}
    </div>
  );
  const trailing = (
    <div className="flex items-center gap-3">
      {suffix ? (
        <span className="text-[length:var(--vs-font-label-md)] font-bold uppercase tracking-[0.16em] text-[var(--vs-color-primary)]">
          {suffix}
        </span>
      ) : null}
      {state === "correct" ? (
        <CheckCircle2 className="size-4 text-[var(--vs-color-primary)]" />
      ) : null}
      {state === "incorrect" ? (
        <XCircle className="size-4 text-[var(--vs-color-error)]" />
      ) : null}
    </div>
  );

  return (
    <VerdantScholarChoiceCard
      className={cn(
        "rounded-[var(--vs-radius-md)] px-5 py-5",
        Boolean(onSelect)
          ? "transition-transform duration-200 hover:-translate-y-px"
          : "pointer-events-none",
        stateClasses[state],
        className,
      )}
      description={undefined}
      leading={leading}
      onClick={onSelect}
      selected={state !== "default"}
      title={label}
      trailing={trailing}
    />
  );
}
