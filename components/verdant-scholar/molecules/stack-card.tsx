/** Verdant Scholar stack cards model the learning dashboard modules and toolkit tiles. */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { VerdantScholarButton } from "../atoms/button";
import { VerdantScholarProgressBar } from "../atoms/progress-bar";

/**
 * Props for Verdant Scholar stack cards.
 * @property actionLabel Optional CTA label.
 * @property className Optional wrapper classes.
 * @property description Supporting text.
 * @property eyebrow Optional small label.
 * @property imageAlt Accessible image description.
 * @property imageUrl Optional hero image.
 * @property meta Optional footer metadata.
 * @property progress Optional progress percentage.
 * @property title Card title.
 * @property tone Visual tone for the card.
 * @property trailing Optional trailing accessory content.
 */
export interface VerdantScholarStackCardProps {
  actionLabel?: string;
  className?: string;
  description: string;
  eyebrow?: string;
  imageAlt?: string;
  imageUrl?: string;
  meta?: ReactNode;
  progress?: number;
  title: string;
  tone?: "surface" | "primary" | "tertiary";
  trailing?: ReactNode;
}

const toneClasses: Record<
  NonNullable<VerdantScholarStackCardProps["tone"]>,
  string
> = {
  surface:
    "bg-[var(--vs-color-surface-container-low)] text-[var(--vs-color-on-surface)]",
  primary:
    "bg-[var(--vs-color-primary-container)] text-[var(--vs-color-on-primary-container)]",
  tertiary:
    "bg-[var(--vs-color-tertiary-container)] text-[var(--vs-color-on-tertiary-container)]",
};

/** Learning or toolkit card with optional image, CTA, and progress summary. */
export function VerdantScholarStackCard({
  actionLabel,
  className,
  description,
  eyebrow,
  imageAlt,
  imageUrl,
  meta,
  progress,
  title,
  tone = "surface",
  trailing,
}: VerdantScholarStackCardProps) {
  return (
    <article
      className={cn(
        "rounded-[var(--vs-radius-md)] p-5",
        toneClasses[tone],
        className,
      )}
    >
      {imageUrl ? (
        <div className="overflow-hidden rounded-[var(--vs-radius-sm)] bg-[var(--vs-color-surface-container-high)]">
          <img
            alt={imageAlt ?? title}
            className="aspect-[4/3] w-full object-cover"
            src={imageUrl}
          />
        </div>
      ) : null}
      <div className={cn("space-y-3", imageUrl ? "mt-4" : "")}>
        {eyebrow ? (
          <p className="text-[length:var(--vs-font-label-sm)] font-bold uppercase tracking-[0.18em] opacity-70">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="text-[length:var(--vs-font-headline-sm)] leading-tight [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
          {title}
        </h3>
        <p className="text-sm leading-6 opacity-80">{description}</p>
        {typeof progress === "number" ? (
          <VerdantScholarProgressBar value={progress} />
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div className="text-[length:var(--vs-font-label-md)] uppercase tracking-[0.14em] opacity-70">
            {meta}
          </div>
          {trailing}
        </div>
        {actionLabel ? (
          <VerdantScholarButton className="w-full justify-center" size="sm">
            {actionLabel}
          </VerdantScholarButton>
        ) : null}
      </div>
    </article>
  );
}
