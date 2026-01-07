"use client";

import type React from "react";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";

/** Item with a type discriminator and payload for finder columns. */
export type FinderItem<T = unknown> = {
  /** Stable id for the item. */
  id: string | number;
  /** Type discriminator used for column configuration. */
  type: string;
  /** Arbitrary payload used by renderers/loaders. */
  payload: T;
};

/** Column configuration per item type, including render and optional loader. */
export type FinderTypeConfig<T = unknown> = {
  /** Title shown at the top of the column. */
  columnTitle: string;
  /** Optional column-level styling overrides. */
  columnClassName?: string;
  /** Render function for items of this type. */
  renderItem: (
    item: FinderItem<T>,
    state: { isSelected: boolean; isActive: boolean },
  ) => React.ReactNode;
  /** Optional loader for child items. */
  loadChildren?: (
    item: FinderItem<T>,
  ) => Promise<FinderItem[] | FinderItem | null>;
  /** Hint for expected child type. */
  childType?: string;
  /** Optional renderer for detail columns. */
  renderDetails?: (item: FinderItem<T>) => React.ReactNode;
  /** Optional title for detail columns. */
  detailsTitle?: string;
  /** Message shown when no items exist. */
  emptyMessage?: string;
  /** Message shown when parent selection is empty. */
  noSelectionMessage?: string;
  /** Message shown when multiple parent items are selected. */
  multiSelectMessage?: string;
};

type FinderColumnState = {
  /** Items displayed in the column. */
  items: FinderItem[];
  /** Currently selected ids for the column. */
  selectedIds: Array<string | number>;
  /** Active id used for child loading. */
  activeId: string | number | null;
  /** Anchor id for shift-range selection. */
  anchorId: string | number | null;
  /** Loading flag for child data. */
  loading: boolean;
  /** Error message for column loads. */
  error: string | null;
  /** Column mode for list or details view. */
  mode: "list" | "details";
  /** Optional details item payload. */
  detailsItem?: FinderItem;
  /** Column type identifier. */
  columnType?: string;
};

/** Current selection state across columns. */
export type FinderSelectionState = {
  /** Active item from the most recently interacted column. */
  activeItem: FinderItem | null;
  /** Index of the column that last received a selection. */
  activeColumnIndex: number | null;
  /** Selected items for each column, by index. */
  selectedItemsByColumn: FinderItem[][];
};

type FinderColumnsProps = {
  /** Root column items to display. */
  rootItems: FinderItem[];
  /** Configuration for each item type. */
  typeConfigs: Record<string, FinderTypeConfig>;
  /** Optional root column type, used when root items are empty. */
  rootType?: string;
  /** Optional wrapper class names. */
  className?: string;
  /** Whether the root column is loading. */
  rootLoading?: boolean;
  /** Optional root-level error message. */
  rootError?: string | null;
  /** Called when the active item changes. */
  onActiveItemChange?: (item: FinderItem | null) => void;
  /** Called when selection state changes. */
  onSelectionChange?: (state: FinderSelectionState) => void;
};

const createEmptyColumn = (): FinderColumnState => ({
  items: [],
  selectedIds: [],
  activeId: null,
  anchorId: null,
  loading: false,
  error: null,
  mode: "list",
});

const createListColumn = (
  items: FinderItem[],
  overrides: Partial<FinderColumnState> = {},
): FinderColumnState => ({
  ...createEmptyColumn(),
  items,
  ...overrides,
  mode: "list",
});

const createDetailsColumn = (
  item: FinderItem,
  overrides: Partial<FinderColumnState> = {},
): FinderColumnState => ({
  ...createEmptyColumn(),
  ...overrides,
  mode: "details",
  detailsItem: item,
  columnType: item.type,
});

/** Column-based picker with multi-select and per-type rendering/loading. */
export function FinderColumns({
  rootItems,
  typeConfigs,
  rootType,
  className,
  rootLoading = false,
  rootError = null,
  onActiveItemChange,
  onSelectionChange,
}: FinderColumnsProps) {
  const [columns, setColumns] = useState<FinderColumnState[]>([
    createListColumn(rootItems, {
      columnType: rootItems[0]?.type ?? rootType,
    }),
  ]);
  const [activeColumnIndex, setActiveColumnIndex] = useState<number | null>(
    null,
  );
  const loadTokenRef = useRef(0);
  const pendingLoadRef = useRef<Record<number, number>>({});

  useEffect(() => {
    setColumns([
      createListColumn(rootItems, {
        columnType: rootItems[0]?.type ?? rootType,
      }),
    ]);
    setActiveColumnIndex(null);
  }, [rootItems, rootType]);

  const getSelectionClass = (isSelected: boolean, isActiveColumn: boolean) => {
    if (!isSelected) return "hover:bg-muted/60";
    return isActiveColumn ? "bg-primary/15 text-primary" : "bg-muted/60";
  };

  const getNextSelection = (
    ids: Array<string | number>,
    selectedIds: Array<string | number>,
    targetId: string | number,
    anchorId: string | number | null,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    const isMeta = event.metaKey || event.ctrlKey;
    const isShift = event.shiftKey;
    let nextSelectedIds: Array<string | number> = [];
    let nextAnchorId = anchorId;
    let nextActiveId: string | number | null = targetId;

    if (isShift && anchorId !== null) {
      const startIndex = ids.indexOf(anchorId);
      const endIndex = ids.indexOf(targetId);
      if (startIndex !== -1 && endIndex !== -1) {
        const [start, end] =
          startIndex <= endIndex
            ? [startIndex, endIndex]
            : [endIndex, startIndex];
        nextSelectedIds = ids.slice(start, end + 1);
      } else {
        nextSelectedIds = [targetId];
        nextAnchorId = targetId;
      }
    } else if (isMeta) {
      nextSelectedIds = selectedIds.includes(targetId)
        ? selectedIds.filter((id) => id !== targetId)
        : [...selectedIds, targetId];
      nextAnchorId = targetId;
    } else {
      nextSelectedIds = [targetId];
      nextAnchorId = targetId;
    }

    if (nextSelectedIds.length === 0) {
      nextActiveId = null;
    } else if (!nextSelectedIds.includes(targetId)) {
      nextActiveId = nextSelectedIds[nextSelectedIds.length - 1] ?? null;
    }

    return { nextSelectedIds, nextAnchorId, nextActiveId };
  };

  const handleSelect = (
    columnIndex: number,
    item: FinderItem,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    const currentColumn = columns[columnIndex];
    if (!currentColumn) return;

    const ids = currentColumn.items.map((entry) => entry.id);
    const { nextSelectedIds, nextAnchorId, nextActiveId } = getNextSelection(
      ids,
      currentColumn.selectedIds,
      item.id,
      currentColumn.anchorId,
      event,
    );

    const typeConfig = typeConfigs[item.type];
    const shouldLoad = nextSelectedIds.length === 1 && typeConfig?.loadChildren;
    const nextColumnIndex = columnIndex + 1;
    setColumns((prev) => {
      const baseColumns = prev.slice(0, columnIndex + 1).map((column, index) =>
        index === columnIndex
          ? {
              ...column,
              selectedIds: nextSelectedIds,
              anchorId: nextAnchorId,
              activeId: nextActiveId,
              error: null,
            }
          : column,
      );

      if (shouldLoad) {
        return [
          ...baseColumns,
          {
            ...createEmptyColumn(),
            loading: true,
            columnType: typeConfig?.childType,
          },
        ];
      }

      return baseColumns;
    });

    setActiveColumnIndex(columnIndex);

    if (!shouldLoad || !typeConfig?.loadChildren || nextActiveId === null) {
      return;
    }

    const token = (loadTokenRef.current += 1);
    pendingLoadRef.current[nextColumnIndex] = token;

    typeConfig
      .loadChildren(item)
      .then((items) => {
        setColumns((prev) => {
          if (pendingLoadRef.current[nextColumnIndex] !== token) {
            return prev;
          }

          const parentColumn = prev[columnIndex];
          if (
            !parentColumn ||
            parentColumn.activeId !== nextActiveId ||
            parentColumn.selectedIds.length !== 1
          ) {
            return prev;
          }

          const nextColumns = prev.slice(0, columnIndex + 1);

          if (!items) {
            return [
              ...nextColumns,
              createListColumn([], {
                columnType: typeConfig?.childType,
              }),
            ];
          }

          if (Array.isArray(items)) {
            return [
              ...nextColumns,
              createListColumn(items, {
                columnType: items[0]?.type ?? typeConfig?.childType,
              }),
            ];
          }

          return [
            ...nextColumns,
            createDetailsColumn(items, {
              columnType: items.type,
            }),
          ];
        });
      })
      .catch((error: Error) => {
        setColumns((prev) => {
          if (pendingLoadRef.current[nextColumnIndex] !== token) {
            return prev;
          }
          const nextColumns = prev.slice(0, columnIndex + 1);
          const errorColumn: FinderColumnState = {
            ...createEmptyColumn(),
            error: error.message || "Failed to load items.",
            columnType: typeConfig?.childType,
          };
          return [...nextColumns, errorColumn];
        });
      });
  };

  const activeItem = useMemo(() => {
    if (activeColumnIndex === null) return null;
    const column = columns[activeColumnIndex];
    if (!column?.activeId) return null;
    return column.items.find((entry) => entry.id === column.activeId) ?? null;
  }, [columns, activeColumnIndex]);

  useEffect(() => {
    onActiveItemChange?.(activeItem);
  }, [activeItem, onActiveItemChange]);

  const selectionState = useMemo<FinderSelectionState>(() => {
    const selectedItemsByColumn = columns.map((column) =>
      column.items.filter((item) => column.selectedIds.includes(item.id)),
    );
    return {
      activeItem,
      activeColumnIndex,
      selectedItemsByColumn,
    };
  }, [activeItem, activeColumnIndex, columns]);

  useEffect(() => {
    if (!onSelectionChange) return;
    onSelectionChange(selectionState);
  }, [onSelectionChange, selectionState]);

  return (
    <div className={cn("flex h-full min-h-0 overflow-x-auto", className)}>
      {columns.map((column, columnIndex) => {
        const columnType = column.columnType ?? column.items[0]?.type ?? null;
        const config = columnType ? typeConfigs[columnType] : undefined;
        const parentColumn = columns[columnIndex - 1];
        const parentType =
          parentColumn?.columnType ?? parentColumn?.items[0]?.type ?? null;
        const parentConfig = parentType ? typeConfigs[parentType] : undefined;
        const isActiveColumn = activeColumnIndex === columnIndex;
        const parentSelectionCount = parentColumn?.selectedIds.length ?? 0;
        const title =
          column.mode === "details"
            ? config?.detailsTitle ?? "Details"
            : config?.columnTitle ?? "Items";

        return (
          <div
            key={`${columnType ?? "column"}-${columnIndex}`}
            className={cn(
              "flex h-full min-h-0 w-72 shrink-0 flex-col border-r",
              config?.columnClassName,
            )}
          >
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </div>
            <div className="flex-1 overflow-y-auto">
              {columnIndex === 0 && rootLoading ? (
                <LoadingSpinner className="py-8" />
              ) : column.loading ? (
                <LoadingSpinner className="py-8" />
              ) : column.error ? (
                <div className="px-3 py-2 text-sm text-destructive">
                  {column.error}
                </div>
              ) : column.mode === "details" && column.detailsItem ? (
                <div className="px-3 py-2 text-sm">
                  {config?.renderDetails
                    ? config.renderDetails(
                        column.detailsItem as FinderItem<unknown>,
                      )
                    : config?.renderItem
                      ? config.renderItem(
                          column.detailsItem as FinderItem<unknown>,
                          { isSelected: false, isActive: isActiveColumn },
                        )
                      : null}
                </div>
              ) : column.items.length ? (
                <ul className="space-y-1 px-2 pb-4">
                  {column.items.map((item) => {
                    const isSelected = column.selectedIds.includes(item.id);
                    return (
                      <li key={`${item.type}-${item.id}`}>
                        <button
                          type="button"
                          onClick={(event) =>
                            handleSelect(columnIndex, item, event)
                          }
                          className={cn(
                            "w-full rounded-md px-3 py-2 text-left text-sm transition",
                            getSelectionClass(isSelected, isActiveColumn),
                          )}
                        >
                          {typeConfigs[item.type]?.renderItem(item, {
                            isSelected,
                            isActive: isActiveColumn,
                          })}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : columnIndex > 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {parentSelectionCount === 0
                    ? (parentConfig?.noSelectionMessage ??
                      "Select an item to view results.")
                    : parentSelectionCount > 1
                      ? (parentConfig?.multiSelectMessage ??
                        "Multiple items selected.")
                      : (config?.emptyMessage ?? "No items available.")}
                </div>
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {rootError ?? config?.emptyMessage ?? "No items available."}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
