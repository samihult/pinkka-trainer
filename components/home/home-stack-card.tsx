/** Home stack cards render collection detail tiles for stack browsing. */
"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Props for the HomeStackCard component.
 * @property cardRef Optional ref for the card article element.
 * @property imageUrl Optional stack hero image.
 * @property isFavorite Whether the favorite indicator is active.
 * @property learnHref Link target for opening the learn cards flow.
 * @property masteryPercent Mock mastery percentage shown in the card footer.
 * @property name Stack display name.
 * @property onToggleFavorite Callback fired when the favorite button is pressed.
 * @property speciesCount Total number of species across the stack.
 * @property testHref Link target for opening the test flow.
 */
export interface HomeStackCardProps {
  cardRef?: (node: HTMLElement | null) => void;
  imageUrl?: string | null;
  isFavorite: boolean;
  learnHref: string;
  masteryPercent: number;
  name: string;
  onToggleFavorite: () => void;
  speciesCount: number;
  testHref: string;
}

/** Learner-facing stack card shown on the collection detail page. */
export function HomeStackCard({
  cardRef,
  imageUrl,
  isFavorite,
  learnHref,
  masteryPercent,
  name,
  onToggleFavorite,
  speciesCount,
  testHref,
}: HomeStackCardProps) {
  const { t } = useI18n();

  return (
    <article
      ref={cardRef}
      className="relative overflow-hidden rounded-lg bg-card shadow-[0_18px_38px_rgba(28,27,27,0.06)]"
    >
      <button
        type="button"
        aria-label={t("group.favoriteStack")}
        aria-pressed={isFavorite}
        onClick={onToggleFavorite}
        className={cn(
          "absolute top-5 right-5 z-10 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[rgba(215,231,244,0.45)] text-white backdrop-blur-md transition hover:bg-[rgba(215,231,244,0.6)]",
          isFavorite ? "text-white" : "text-white/90",
        )}
      >
        <Heart
          className="h-7 w-7"
          fill={isFavorite ? "currentColor" : "none"}
        />
      </button>
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

      <div className="flex min-h-[11.5rem] flex-col justify-between px-6 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-7">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 gap-y-4">
          <h2 className="max-w-[14rem] text-[clamp(1.25rem,3.2vw,1.75rem)] font-bold leading-[1.02] tracking-[0.005em] text-foreground sm:max-w-[16rem]">
            {name}
          </h2>
          {/*<div className="shrink-0 pt-1 text-right">*/}
          {/*  <p className="text-[clamp(2rem,2.6vw,3rem)] leading-none font-bold text-primary">*/}
          {/*    {masteryPercent}%*/}
          {/*  </p>*/}
          {/*  <p className="mt-2 text-[0.7rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">*/}
          {/*    {t("home.mastery")}*/}
          {/*  </p>*/}
          {/*</div>*/}
        </div>

        <div className="space-y-4">
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="flex-1">
              <Link href={learnHref}>{t("home.learn")}</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href={testHref}>{t("home.takeTest")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
