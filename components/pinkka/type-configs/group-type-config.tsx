import type { FinderItem, FinderTypeConfig } from "@/components/finder-columns";
import { PinkkaGroupItem } from "@/components/pinkka/pinkka-group-item";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";
import type { PinkkaGroup } from "@/lib/pinkka/pinkka-api";

/** Options for building the group column type config. */
export interface CreateGroupTypeConfigOptions {
  /** Preferred language for localized fields. */
  preferredLang: PinkkaLanguage;
  /** Optional version to refresh import status indicators. */
  importStatusVersion?: number;
  /** Loader for child stack items. */
  loadChildren: (
    item: FinderItem<PinkkaGroup>,
  ) => Promise<FinderItem[] | FinderItem | null>;
}

/** Build the finder type config for Pinkka groups. */
export function createGroupTypeConfig({
  preferredLang,
  importStatusVersion,
  loadChildren,
}: CreateGroupTypeConfigOptions): FinderTypeConfig<PinkkaGroup> {
  return {
    columnTitle: "Groups",
    columnClassName: "bg-muted/20",
    childType: "stack",
    noSelectionMessage: "Select a group to view stacks.",
    multiSelectMessage:
      "Multiple groups selected. Choose a single group to view stacks.",
    renderItem: (item) => (
      <PinkkaGroupItem
        group={item.payload}
        preferredLang={preferredLang}
        importStatusVersion={importStatusVersion}
      />
    ),
    loadChildren,
  };
}
