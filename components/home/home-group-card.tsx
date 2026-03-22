/** Home group cards render the Figma-inspired collection tiles used on the front page. */
"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";

/**
 * Props for the HomeGroupCard component.
 * @property href Optional link target for opening the group.
 * @property imageUrl Optional group hero image.
 * @property isFavorite Whether the mock favorite indicator is active.
 * @property masteryPercent Mock mastery percentage shown in the card footer.
 * @property name Group display name.
 * @property onToggleFavorite Callback fired when the favorite button is pressed.
 * @property speciesCount Total number of species across the group's stacks.
 */
export interface HomeGroupCardProps {
  href?: string;
  imageUrl?: string | null;
  isFavorite: boolean;
  masteryPercent: number;
  name: string;
  onToggleFavorite: () => void;
  speciesCount: number;
}

/** Collection card used on the redesigned home page group grid. */
export function HomeGroupCard({
  href,
  imageUrl,
  isFavorite,
  masteryPercent,
  name,
  onToggleFavorite,
  speciesCount,
}: HomeGroupCardProps) {
  const { t } = useI18n();

  const imagePanel = (
    <div className="aspect-[1.45/1] overflow-hidden rounded-[2rem] bg-muted">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
      ) : (
        <div className="h-full w-full bg-[linear-gradient(135deg,rgba(63,106,0,0.18),rgba(202,236,188,0.72))]" />
      )}
    </div>
  );

  const content = (
    <div className="space-y-4 px-4 pb-4">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-bold leading-[1.05] tracking-tight text-foreground">
          {name}
        </h2>
        <div className="shrink-0 pt-1 text-right">
          <p className="text-[2.125rem] leading-none font-bold text-primary">
            {masteryPercent}%
          </p>
          <p className="mt-1 text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {t("home.mastery")}
          </p>
        </div>
      </div>
      <p className="text-[1.05rem] text-foreground">
        {t("home.speciesCount", { count: speciesCount })}
      </p>
      <Progress
        value={masteryPercent}
        aria-label={t("home.mastery")}
        className="h-2 rounded-full bg-muted [&_[data-slot=progress-indicator]]:bg-primary"
      />
    </div>
  );

  return (
    <article className="relative rounded-[2.25rem] bg-card p-4 shadow-[0_18px_40px_rgba(28,27,27,0.08)]">
      <button
        type="button"
        aria-label={t("home.favorite")}
        aria-pressed={isFavorite}
        onClick={onToggleFavorite}
        className={cn(
          "absolute top-8 right-8 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/30 text-white backdrop-blur-md transition hover:bg-white/40",
          isFavorite ? "text-white" : "text-white/90",
        )}
      >
        <Heart
          className="h-6 w-6"
          fill={isFavorite ? "currentColor" : "none"}
        />
      </button>
      <div className="space-y-5">
        {href ? (
          <Link href={href} className="group block space-y-5">
            {imagePanel}
            <div className="transition-transform duration-200 group-hover:translate-x-0.5">
              {content}
            </div>
          </Link>
        ) : (
          <>
            {imagePanel}
            {content}
          </>
        )}
      </div>
    </article>
  );
}
