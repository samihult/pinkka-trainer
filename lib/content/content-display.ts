import type { LocalizedText, Species, SpeciesImage } from "@/lib/types";

/** Resolve localized text with preferred language fallback. */
export function getLocalizedText(
  text: LocalizedText | string | undefined,
  preferredLang = "fi",
): string {
  if (!text) return "";
  if (typeof text === "string") return text;

  if (text[preferredLang as keyof LocalizedText]) {
    return text[preferredLang as keyof LocalizedText] || "";
  }

  return text.fi || text.en || text.sv || Object.values(text)[0] || "";
}

/** Pick the most suitable image URL for a species image entry. */
export function getSpeciesImageUrl(image?: SpeciesImage): string {
  if (!image?.urls) return "";
  return (
    image.urls.full ||
    image.urls.large ||
    image.urls.square ||
    image.urls.thumbnail ||
    image.urls.original ||
    ""
  );
}

/** Resolve a localized species description from the first available section. */
export function getSpeciesDescription(
  detail: Species["data"],
  preferredLang = "fi",
): string {
  const firstSection = detail.description?.[0];
  if (!firstSection) return "";
  return getLocalizedText(firstSection.body, preferredLang);
}

/** Collect species images that resolve to a usable image URL. */
export function getSpeciesImagesWithUrls(
  detail: Species["data"],
  allowedImageIds?: string[],
): SpeciesImage[] {
  const images = detail.images ?? [];
  if (images.length === 0) return [];
  const allowedSet =
    allowedImageIds && allowedImageIds.length > 0
      ? new Set(allowedImageIds)
      : null;

  return images.filter((image) => {
    if (allowedSet && !allowedSet.has(image.id)) return false;
    return Boolean(getSpeciesImageUrl(image));
  });
}

