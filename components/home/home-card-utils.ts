/** Shared media helpers for learner-facing home and collection cards. */
import type { EntityImage, SpeciesImage } from "@/lib/types";

type ImageWithUrls = Pick<EntityImage, "urls"> | Pick<SpeciesImage, "urls">;

/** Resolve the best available image URL for group and stack cards. */
export function getEntityImageUrl(images?: ImageWithUrls[]): string | null {
  if (!images?.length) return null;

  for (const image of images) {
    const url =
      image.urls?.large ||
      image.urls?.full ||
      image.urls?.square ||
      image.urls?.thumbnail ||
      image.urls?.original;
    if (url) return url;
  }

  return null;
}
