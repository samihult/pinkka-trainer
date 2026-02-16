import type { FinderItem, FinderTypeConfig } from "@/components/finder-columns";
import { PinkkaSpeciesItem } from "@/components/pinkka/pinkka-species-item";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";
import type { PinkkaSpeciesCard } from "@/lib/pinkka/pinkka-api";

/** Options for building the species column type config. */
export interface CreateSpeciesTypeConfigOptions {
  /** Preferred language for localized fields. */
  preferredLang: PinkkaLanguage;
  /** Optional selected parent group id for import-status lookup. */
  selectedGroupId?: number | null;
  /** Optional selected parent stack id for import-status lookup. */
  selectedStackId?: number | null;
  /** Optional version to refresh import status indicators. */
  importStatusVersion?: number;
  /** Loader for child detail items. */
  loadChildren: (
    item: FinderItem<PinkkaSpeciesCard>,
  ) => Promise<FinderItem[] | FinderItem | null>;
}

/** Build the finder type config for Pinkka species cards. */
export function createSpeciesTypeConfig({
  preferredLang,
  selectedGroupId,
  selectedStackId,
  importStatusVersion,
  loadChildren,
}: CreateSpeciesTypeConfigOptions): FinderTypeConfig<PinkkaSpeciesCard> {
  return {
    columnTitle: "Species",
    columnClassName: "bg-muted/10",
    emptyMessage: "No species available.",
    renderItem: (item) => (
      <PinkkaSpeciesItem
        species={item.payload}
        groupId={selectedGroupId}
        stackId={selectedStackId}
        preferredLang={preferredLang}
        importStatusVersion={importStatusVersion}
      />
    ),
    loadChildren,
  };
}
