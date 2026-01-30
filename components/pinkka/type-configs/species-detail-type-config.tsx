import type { FinderTypeConfig } from "@/components/finder-columns";
import { PinkkaSpeciesDetail } from "@/components/pinkka/pinkka-species-detail";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";
import type { PinkkaSpeciesDetail as PinkkaSpeciesDetailPayload } from "@/lib/pinkka/pinkka-api";

/** Options for building the species detail column type config. */
export interface CreateSpeciesDetailTypeConfigOptions {
  /** Preferred language for localized fields. */
  preferredLang: PinkkaLanguage;
}

/** Build the finder type config for Pinkka species details. */
export function createSpeciesDetailTypeConfig({
  preferredLang,
}: CreateSpeciesDetailTypeConfigOptions): FinderTypeConfig<PinkkaSpeciesDetailPayload> {
  return {
    columnTitle: "Species",
    detailsTitle: "Details",
    columnClassName: "bg-background",
    renderItem: () => null,
    renderDetails: (item) => (
      <PinkkaSpeciesDetail detail={item.payload} preferredLang={preferredLang} />
    ),
  };
}
