import type { PinkkaSpeciesDetail } from "./pinkka-api";
import { getLocalizedText } from "./pinkka-api";

/** Resolve a localized species description from the first available section. */
export function getSpeciesDescription(
  detail: PinkkaSpeciesDetail,
  preferredLang = "fi",
): string {
  const firstSection = detail.description?.[0];
  if (!firstSection) return "";
  return getLocalizedText(firstSection.body, preferredLang);
}

/** Resolve a localized common name for a species. */
export function getSpeciesCommonName(
  detail: PinkkaSpeciesDetail,
  preferredLang = "fi",
): string {
  return getLocalizedText(detail.vernacularName, preferredLang);
}

/** Pick the most suitable image URL for a species image entry. */
export function getSpeciesImageUrl(
  image?: NonNullable<PinkkaSpeciesDetail["images"]>[number],
): string {
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

/** Pick the primary image URL for a species detail. */
export function getSpeciesPrimaryImageUrl(
  detail: PinkkaSpeciesDetail,
): string {
  return getSpeciesImageUrl(detail.images?.[0]);
}
