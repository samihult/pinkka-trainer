import type { FinderItem, FinderTypeConfig } from "@/components/finder-columns";

/** Options for building the root column type config. */
export interface CreateRootTypeConfigOptions {
  /** Loader for child group items. */
  loadChildren: (
    item: FinderItem<null>,
  ) => Promise<FinderItem[] | FinderItem | null>;
}

/** Build the finder type config for the virtual root item. */
export function createRootTypeConfig({
  loadChildren,
}: CreateRootTypeConfigOptions): FinderTypeConfig<null> {
  return {
    columnTitle: "Root",
    childType: "group",
    emptyMessage: "No groups available.",
    renderItem: () => null,
    loadChildren,
  };
}
