/** Verdant Scholar fact cards model morphology, taxonomy, habitat, and insight panels. */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Fact row metadata for Verdant Scholar fact cards.
 * @property label Row label.
 * @property value Row value content.
 */
export interface VerdantScholarFactRow {
  label: string;
  value: ReactNode;
}

/**
 * Props for Verdant Scholar fact cards.
 * @property className Optional wrapper classes.
 * @property icon Optional leading icon.
 * @property rows Structured fact rows to render.
 * @property summary Optional paragraph shown below the rows.
 * @property title Card title.
 * @property tone Surface tone for the card.
 */
export interface VerdantScholarFactCardProps {
  className?: string;
  icon?: ReactNode;
  rows?: VerdantScholarFactRow[];
  summary?: ReactNode;
  title: string;
  tone?: "surface" | "accent" | "soft";
}

const toneClasses: Record<
  NonNullable<VerdantScholarFactCardProps["tone"]>,
  string
> = {
  surface:
    "bg-[var(--vs-color-surface-container-lowest)] text-[var(--vs-color-on-surface)]",
  accent: "bg-[var(--vs-color-primary)] text-[var(--vs-color-on-primary)]",
  soft: "bg-[color:rgba(202,236,188,0.28)] text-[var(--vs-color-on-primary-container)]",
};

/** General-purpose fact card used across species profile and assessment layouts. */
export function VerdantScholarFactCard({
  className,
  icon,
  rows,
  summary,
  title,
  tone = "surface",
}: VerdantScholarFactCardProps) {
  return (
    <article
      className={cn(
        "rounded-[var(--vs-radius-md)] p-6",
        toneClasses[tone],
        className,
      )}
    >
      <h3 className="flex items-center gap-3 text-[length:var(--vs-font-headline-sm)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
        {icon}
        <span>{title}</span>
      </h3>
      {rows?.length ? (
        <div
          className={cn(
            "mt-6 grid gap-6",
            rows.length > 2 ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          {rows.map((row) => (
            <div key={row.label} className="space-y-1">
              <p className="text-[length:var(--vs-font-label-sm)] uppercase tracking-[0.16em] opacity-70">
                {row.label}
              </p>
              <div className="text-lg font-semibold leading-tight">
                {row.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {summary ? (
        <div className="mt-4 text-sm leading-6 opacity-90">{summary}</div>
      ) : null}
    </article>
  );
}
