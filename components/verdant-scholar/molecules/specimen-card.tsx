/** Verdant Scholar specimen-card molecules model the Stitch archive gallery cards. */
import { cn } from "@/lib/utils";

import { VerdantScholarBadge } from "../atoms/badge";

/**
 * Props for Verdant Scholar specimen cards.
 * @property className Optional wrapper classes.
 * @property imageAlt Accessible image description.
 * @property imageUrl Image shown in the specimen frame.
 * @property scientificName Secondary italic nomenclature.
 * @property status Optional floating conservation label.
 * @property taxonomy Uppercase taxonomy label above the title.
 * @property title Primary species or specimen title.
 */
export interface VerdantScholarSpecimenCardProps {
  className?: string;
  imageAlt: string;
  imageUrl: string;
  scientificName: string;
  status?: string;
  taxonomy: string;
  title: string;
}

/** Editorial specimen card with tonal framing and floating status badge. */
export function VerdantScholarSpecimenCard({
  className,
  imageAlt,
  imageUrl,
  scientificName,
  status,
  taxonomy,
  title,
}: VerdantScholarSpecimenCardProps) {
  return (
    <article className={cn("group space-y-5", className)}>
      <div className="relative overflow-hidden rounded-[var(--vs-radius-md)] bg-[var(--vs-color-surface-container-low)]">
        <img
          alt={imageAlt}
          className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          src={imageUrl}
        />
        {status ? (
          <VerdantScholarBadge
            className="absolute right-4 top-4"
            tone="neutral"
          >
            {status}
          </VerdantScholarBadge>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <p className="text-[length:var(--vs-font-label-sm)] font-bold uppercase tracking-[0.24em] text-[var(--vs-color-primary)]">
          {taxonomy}
        </p>
        <h3 className="text-[length:var(--vs-font-headline-md)] leading-none text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
          {title}
        </h3>
        <p className="text-[length:var(--vs-font-body-md)] italic text-[var(--vs-color-on-surface-variant)]">
          {scientificName}
        </p>
      </div>
    </article>
  );
}
