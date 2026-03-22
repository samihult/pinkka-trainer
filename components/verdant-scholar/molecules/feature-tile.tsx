/** Verdant Scholar feature tiles support the asymmetric bento cards used in Stitch. */
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Props for Verdant Scholar feature tiles.
 * @property className Optional wrapper classes.
 * @property ctaLabel Optional call-to-action label.
 * @property description Optional supporting body text.
 * @property emphasis Grid emphasis that affects the tile height.
 * @property imageAlt Accessible image description.
 * @property imageUrl Tile image.
 * @property title Tile title.
 */
export interface VerdantScholarFeatureTileProps {
  className?: string;
  ctaLabel?: string;
  description?: string;
  emphasis?: "hero" | "wide" | "compact";
  imageAlt: string;
  imageUrl: string;
  title: string;
}

const emphasisClasses: Record<
  NonNullable<VerdantScholarFeatureTileProps["emphasis"]>,
  string
> = {
  hero: "min-h-[22rem] md:min-h-[36rem]",
  wide: "min-h-[16rem]",
  compact: "min-h-[16rem]",
};

/** Overlay image tile used for featured taxonomy sections and learning modules. */
export function VerdantScholarFeatureTile({
  className,
  ctaLabel,
  description,
  emphasis = "wide",
  imageAlt,
  imageUrl,
  title,
}: VerdantScholarFeatureTileProps) {
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[var(--vs-radius-md)] bg-[var(--vs-color-surface-container)]",
        emphasisClasses[emphasis],
        className,
      )}
    >
      <img
        alt={imageAlt}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        src={imageUrl}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(28,27,27,0.84)] via-[rgba(28,27,27,0.18)] to-transparent" />
      <div className="relative flex h-full flex-col justify-end gap-3 p-6 text-white">
        <h3 className="max-w-md text-[length:var(--vs-font-headline-md)] leading-tight [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
          {title}
        </h3>
        {description ? (
          <p className="max-w-md text-sm leading-6 text-white/80">
            {description}
          </p>
        ) : null}
        {ctaLabel ? (
          <span className="inline-flex items-center gap-2 text-[length:var(--vs-font-label-md)] font-bold uppercase tracking-[0.18em]">
            {ctaLabel}
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
          </span>
        ) : null}
      </div>
    </article>
  );
}
