/** Verdant Scholar stack cards model the learning dashboard modules and toolkit tiles. */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { VerdantScholarButton } from "../atoms/button";
import { VerdantScholarCard, VerdantScholarCardContent } from "../atoms/card";
import { VerdantScholarProgressBar } from "../atoms/progress-bar";
import { VerdantScholarHeading, VerdantScholarText } from "../atoms/text";

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
    <VerdantScholarCard className={className} tone={tone}>
      {imageUrl ? (
        <div className="overflow-hidden rounded-[var(--vs-radius-sm)] bg-[var(--vs-color-surface-container-high)]">
          <img
            alt={imageAlt ?? title}
            className="aspect-[4/3] w-full object-cover"
            src={imageUrl}
          />
        </div>
      ) : null}
      <VerdantScholarCardContent
        className={cn("space-y-3 pt-5", imageUrl ? "mt-4" : "")}
      >
        {eyebrow ? (
          <VerdantScholarText tone="inherit" variant="eyebrow">
            {eyebrow}
          </VerdantScholarText>
        ) : null}
        <VerdantScholarHeading asChild tone="inherit" variant="subheadline">
          <h3>{title}</h3>
        </VerdantScholarHeading>
        <VerdantScholarText tone="inherit" variant="meta">
          {description}
        </VerdantScholarText>
        {typeof progress === "number" ? (
          <VerdantScholarProgressBar value={progress} />
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <VerdantScholarText asChild tone="inherit" variant="label">
            <div>{meta}</div>
          </VerdantScholarText>
          {trailing}
        </div>
        {actionLabel ? (
          <VerdantScholarButton className="w-full justify-center" size="sm">
            {actionLabel}
          </VerdantScholarButton>
        ) : null}
      </VerdantScholarCardContent>
    </VerdantScholarCard>
  );
}
