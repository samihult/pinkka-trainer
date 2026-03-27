/** Verdant Scholar specimen-card molecules model the Stitch archive gallery cards. */
import { cn } from "@/lib/utils";

import { VerdantScholarBadge } from "../atoms/badge";
import { VerdantScholarCard, VerdantScholarCardContent } from "../atoms/card";
import { VerdantScholarHeading, VerdantScholarText } from "../atoms/text";

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
    <VerdantScholarCard
      className={cn("group overflow-hidden", className)}
      interactive
      tone="surface"
    >
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
      <VerdantScholarCardContent className="space-y-1.5 pt-5">
        <VerdantScholarText tone="primary" variant="eyebrow">
          {taxonomy}
        </VerdantScholarText>
        <VerdantScholarHeading asChild variant="headline">
          <h3>{title}</h3>
        </VerdantScholarHeading>
        <VerdantScholarText tone="muted" variant="italic">
          {scientificName}
        </VerdantScholarText>
      </VerdantScholarCardContent>
    </VerdantScholarCard>
  );
}
