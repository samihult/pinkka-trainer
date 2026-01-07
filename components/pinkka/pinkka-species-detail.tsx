"use client";

import { useEffect, useMemo, useState } from "react";
import sanitizeHtml from "sanitize-html";
import {
  getLocalizedText,
  type PinkkaSpeciesDetail,
} from "@/lib/pinkka/pinkka-api";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";

/** Image details resolved for rendering a carousel. */
type PinkkaDetailImage = {
  /** Image id. */
  id: string;
  /** Optional localized caption. */
  caption?: PinkkaSpeciesDetail["images"] extends Array<infer T>
    ? T["caption"]
    : undefined;
  /** Resolved image URL to display. */
  url: string;
  /** Optional raw metadata for alternative text. */
  meta?: PinkkaSpeciesDetail["images"] extends Array<infer T>
    ? T["meta"]
    : undefined;
};

/** Props for rendering a Pinkka species detail panel. */
export interface PinkkaSpeciesDetailProps {
  /** Pinkka species detail payload to display. */
  detail: PinkkaSpeciesDetail;
  /** Preferred language for localized fields. */
  preferredLang: PinkkaLanguage;
}

/** Detailed description view for a Pinkka species. */
export function PinkkaSpeciesDetail({
  detail,
  preferredLang,
}: PinkkaSpeciesDetailProps) {
  const images = useMemo<PinkkaDetailImage[]>(() => {
    return (detail.images ?? [])
      .map((image) => {
        const url =
          image.urls?.large ??
          image.urls?.full ??
          image.urls?.original ??
          image.urls?.square ??
          image.urls?.thumbnail ??
          "";
        return {
          id: image.id,
          caption: image.caption,
          meta: image.meta,
          url,
        };
      })
      .filter((image) => image.url);
  }, [detail.images]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [detail.taxonId]);

  useEffect(() => {
    if (activeIndex >= images.length && images.length > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, images.length]);

  const activeImage = images[activeIndex];
  const handlePrev = () => {
    if (images.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  };
  const handleNext = () => {
    if (images.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  const activeCaption = activeImage
    ? getLocalizedText(activeImage.caption, preferredLang)
    : "";
  const activeAlt =
    activeCaption ||
    (activeImage?.meta?.rightsOwner
      ? `${detail.scientificName} (${activeImage.meta.rightsOwner})`
      : detail.scientificName);

  return (
    <div className="space-y-4 px-1 text-sm">
      <div>
        <div className="text-lg font-semibold">{detail.scientificName}</div>
        <div className="text-muted-foreground">
          {getLocalizedText(detail.vernacularName, preferredLang)}
        </div>
      </div>
      {activeImage && (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-md border border-border bg-muted/20">
            <img
              src={activeImage.url}
              alt={activeAlt}
              className="h-52 w-full object-contain sm:h-60"
              loading="lazy"
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="min-h-[1rem]">{activeCaption || "Image"}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
                aria-label="Previous image"
              >
                Prev
              </button>
              <span>
                {activeIndex + 1} / {images.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
                aria-label="Next image"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      {detail.description?.map((section) => (
        <div key={section.predicate} className="space-y-1">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            {getLocalizedText(section.title, preferredLang)}
          </div>
          <div
            className="text-sm text-foreground"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(
                getLocalizedText(section.body, preferredLang) ?? "",
              ),
            }}
          />
        </div>
      ))}
      {!detail.description?.length && (
        <div className="text-muted-foreground">
          No description available for this species.
        </div>
      )}
    </div>
  );
}
