"use client";

import { useEffect, useMemo, useState } from "react";
import sanitizeHtml from "sanitize-html";
import {
  getLocalizedText,
  type PinkkaSpeciesDetail,
} from "@/lib/pinkka/pinkka-api";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";

/** Single Pinkka species image entry. */
type PinkkaSpeciesImage = NonNullable<PinkkaSpeciesDetail["images"]>[number];

/** Image details resolved for rendering a carousel. */
type PinkkaDetailImage = {
  /** Image id. */
  id: string;
  /** Optional localized caption. */
  caption?: PinkkaSpeciesImage["caption"];
  /** Resolved image URL to display. */
  url: string;
  /** Optional raw metadata for alternative text. */
  meta?: PinkkaSpeciesImage["meta"];
};

/** Props for rendering a Pinkka species detail panel. */
export interface PinkkaSpeciesDetailProps {
  /** Pinkka species detail payload to display. */
  detail: PinkkaSpeciesDetail;
  /** Preferred language for localized fields. */
  preferredLang: PinkkaLanguage;
  /** Whether to render scientific and vernacular names in this panel. */
  showSpeciesHeader?: boolean;
  /** Whether to render the image gallery block. */
  showImages?: boolean;
  /** Whether sections without content should be omitted. */
  hideEmptySections?: boolean;
}

/** Detailed description view for a Pinkka species. */
export function PinkkaSpeciesDetail({
  detail,
  preferredLang,
  showSpeciesHeader = true,
  showImages = true,
  hideEmptySections = true,
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
  const descriptionSections = useMemo(() => {
    return (detail.description ?? [])
      .map((section) => {
        const title = getLocalizedText(section.title, preferredLang);
        const bodyHtml = sanitizeHtml(
          getLocalizedText(section.body, preferredLang) ?? "",
        );
        const bodyText = bodyHtml
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .trim();

        return {
          predicate: section.predicate,
          title,
          bodyHtml,
          hasContent: bodyText.length > 0,
        };
      })
      .filter((section) => (hideEmptySections ? section.hasContent : true));
  }, [detail.description, hideEmptySections, preferredLang]);

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
      {showSpeciesHeader ? (
        <div>
          <div className="text-lg font-semibold">{detail.scientificName}</div>
          <div className="text-muted-foreground">
            {getLocalizedText(detail.vernacularName, preferredLang)}
          </div>
        </div>
      ) : null}
      {showImages && activeImage && (
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
      {descriptionSections.map((section) => (
        <div key={section.predicate} className="space-y-1">
          {section.title ? (
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              {section.title}
            </div>
          ) : null}
          <div
            className="text-sm text-foreground"
            dangerouslySetInnerHTML={{
              __html: section.bodyHtml,
            }}
          />
        </div>
      ))}
      {!descriptionSections.length && (
        <div className="text-muted-foreground">
          No description available for this species.
        </div>
      )}
    </div>
  );
}
