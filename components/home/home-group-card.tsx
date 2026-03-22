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
 * @property cardRef Optional ref for the card article element.
 * @property href Optional link target for opening the group.
 * @property imageUrl Optional group hero image.
 * @property isFavorite Whether the favorite indicator is active.
 * @property masteryPercent Mock mastery percentage shown in the card footer.
 * @property name Group display name.
 * @property onToggleFavorite Callback fired when the favorite button is pressed.
 * @property speciesCount Total number of species across the group's stacks.
 */
export interface HomeGroupCardProps {
  cardRef?: (node: HTMLElement | null) => void;
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
  cardRef,
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
    <div className="relative h-[15.5rem] overflow-hidden rounded-t-lg rounded-b-none bg-muted sm:h-[18.5rem]">
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
    <div className="flex min-h-[11.5rem] flex-col justify-between px-6 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-7">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 gap-y-4">
        <h2 className="max-w-[14rem] text-[clamp(1.25rem,3.2vw,1.75rem)] font-bold leading-[1.02] tracking-[0.005em] text-foreground sm:max-w-[16rem]">
          {name}
        </h2>
        {/*<div className="shrink-0 pt-1 text-right">*/}
        {/*  <p className="text-[clamp(2rem,2.6vw,3.4rem)] leading-none font-bold text-primary">*/}
        {/*    {masteryPercent}%*/}
        {/*  </p>*/}
        {/*  <p className="mt-2 text-[0.65rem] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-[0.75rem]">*/}
        {/*    {t("home.mastery")}*/}
        {/*  </p>*/}
        {/*</div>*/}
      </div>
      <div className="space-y-3">
        <p className="text-[1rem] text-foreground sm:text-[1.05rem]">
          {t("home.speciesCount", { count: speciesCount })}
        </p>
        <Progress
          value={masteryPercent}
          aria-label={t("home.mastery")}
          className="h-2.5 rounded-full bg-[rgba(0,0,0,0.08)] [&_[data-slot=progress-indicator]]:bg-[linear-gradient(90deg,#4b7f0f_0%,#8ac84a_100%)]"
        />
      </div>
    </div>
  );

  return (
    <article
      ref={cardRef}
      className="relative overflow-hidden rounded-lg bg-card shadow-[0_18px_38px_rgba(28,27,27,0.06)]"
    >
      <button
        type="button"
        aria-label={t("home.favorite")}
        aria-pressed={isFavorite}
        onClick={onToggleFavorite}
        className={cn(
          "absolute top-5 right-5 z-10 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[rgba(215,231,244,0.45)] text-white backdrop-blur-md transition hover:bg-[rgba(215,231,244,0.6)] sm:top-6 sm:right-6 sm:h-13 sm:w-13",
          isFavorite ? "text-white" : "text-white/90",
        )}
      >
        <Heart
          className="h-7 w-7 sm:h-8 sm:w-8"
          fill={isFavorite ? "currentColor" : "none"}
        />
      </button>
      <div>
        {href ? (
          <Link href={href} className="group block">
            {imagePanel}
            {content}
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
