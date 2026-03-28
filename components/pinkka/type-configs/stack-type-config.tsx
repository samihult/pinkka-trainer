/** Finder column configuration for Pinkka stack rows. */

import type { FinderItem, FinderTypeConfig } from "@/components/finder-columns";
import { PinkkaStackItem } from "@/components/pinkka/pinkka-stack-item";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";
import type { PinkkaSubStack } from "@/lib/pinkka/pinkka-api";

/** Options for building the stack column type config. */
export interface CreateStackTypeConfigOptions {
  /** Preferred language for localized fields. */
  preferredLang: PinkkaLanguage;
  /** Loader for child species items. */
  loadChildren: (
    item: FinderItem<PinkkaSubStack>,
  ) => Promise<FinderItem[] | FinderItem | null>;
}

/** Build the finder type config for Pinkka stacks. */
export function createStackTypeConfig({
  preferredLang,
  loadChildren,
}: CreateStackTypeConfigOptions): FinderTypeConfig<PinkkaSubStack> {
  return {
    columnTitle: "Stacks",
    columnClassName: "bg-background",
    childType: "species",
    emptyMessage: "No stacks available.",
    noSelectionMessage: "Select a stack to view species.",
    multiSelectMessage:
      "Multiple stacks selected. Choose a single stack to view species.",
    renderItem: (item) => (
      <PinkkaStackItem stack={item.payload} preferredLang={preferredLang} />
    ),
    loadChildren,
  };
}
