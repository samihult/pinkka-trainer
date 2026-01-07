"use client";

import type React from "react";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";

export type FinderItem<T = unknown> = {
  id: string | number;
  type: string;
  payload: T;
};

export type FinderTypeConfig<T = unknown> = {
  columnTitle: string;
  columnClassName?: string;
  renderItem: (
    item: FinderItem<T>,
    state: { isSelected: boolean; isActive: boolean },
  ) => React.ReactNode;
  loadChildren?: (item: FinderItem<T>) => Promise<FinderItem[]>;
  childType?: string;
  emptyMessage?: string;
  noSelectionMessage?: string;
  multiSelectMessage?: string;
};

type FinderColumnState = {
  items: FinderItem[];
  selectedIds: Array<string | number>;
  activeId: string | number | null;
  anchorId: string | number | null;
  loading: boolean;
  error: string | null;
};

export type FinderSelectionState = {
  activeItem: FinderItem | null;
  activeColumnIndex: number | null;
  selectedItemsByColumn: FinderItem[][];
};

type FinderColumnsProps = {
  rootItems: FinderItem[];
  typeConfigs: Record<string, FinderTypeConfig>;
  columnOrder?: string[];
  className?: string;
  rootLoading?: boolean;
  rootError?: string | null;
  renderTrailing?: (state: FinderSelectionState) => React.ReactNode;
  onActiveItemChange?: (item: FinderItem | null) => void;
  onSelectionChange?: (state: FinderSelectionState) => void;
};

const createEmptyColumn = (): FinderColumnState => ({
  items: [],
  selectedIds: [],
  activeId: null,
  anchorId: null,
  loading: false,
  error: null,
});

export function FinderColumns({
  rootItems,
  typeConfigs,
  columnOrder,
  className,
  rootLoading = false,
  rootError = null,
  onActiveItemChange,
  onSelectionChange,
  renderTrailing,
}: FinderColumnsProps) {
  const [columns, setColumns] = useState<FinderColumnState[]>([
    { ...createEmptyColumn(), items: rootItems },
  ]);
  const [activeColumnIndex, setActiveColumnIndex] = useState<number | null>(
    null,
  );
  const loadTokenRef = useRef(0);
  const pendingLoadRef = useRef<Record<number, number>>({});

  const columnCount = columnOrder?.length ?? columns.length;

  useEffect(() => {
    const nextColumns = Array.from(
      { length: columnOrder?.length ?? 1 },
      (_, index) =>
        index === 0
          ? { ...createEmptyColumn(), items: rootItems }
          : createEmptyColumn(),
    );
    setColumns(nextColumns);
    setActiveColumnIndex(null);
  }, [rootItems, columnOrder?.length]);

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
    const nextColumnCount = columnOrder?.length ?? undefined;

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

      if (columnOrder?.length) {
        const filled = [...baseColumns];
        for (let i = filled.length; i < columnOrder.length; i += 1) {
          filled.push(createEmptyColumn());
        }
        for (let i = columnIndex + 1; i < filled.length; i += 1) {
          filled[i] = createEmptyColumn();
        }
        if (shouldLoad && nextColumnIndex < columnOrder.length) {
          filled[nextColumnIndex] = {
            ...createEmptyColumn(),
            loading: true,
          };
        }
        return filled;
      }

      if (shouldLoad) {
        return [
          ...baseColumns,
          {
            ...createEmptyColumn(),
            loading: true,
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

          const nextColumn: FinderColumnState = {
            ...createEmptyColumn(),
            items,
          };
          const nextColumns = prev.slice(0, columnIndex + 1);

          if (columnOrder?.length) {
            const filled = [...nextColumns];
            for (let i = filled.length; i < columnOrder.length; i += 1) {
              filled.push(createEmptyColumn());
            }
            if (nextColumnIndex < filled.length) {
              filled[nextColumnIndex] = nextColumn;
            }
            return filled;
          }

          return [...nextColumns, nextColumn];
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
          };
          if (columnOrder?.length) {
            const filled = [...nextColumns];
            for (let i = filled.length; i < columnOrder.length; i += 1) {
              filled.push(createEmptyColumn());
            }
            if (nextColumnIndex < filled.length) {
              filled[nextColumnIndex] = errorColumn;
            }
            return filled;
          }
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
      {Array.from({ length: columnCount }, (_, columnIndex) => {
        const column = columns[columnIndex] ?? createEmptyColumn();
        const columnType =
          columnOrder?.[columnIndex] ?? column.items[0]?.type ?? null;
        const config = columnType ? typeConfigs[columnType] : undefined;
        const parentColumn = columns[columnIndex - 1];
        const parentType =
          columnIndex > 0
            ? (columnOrder?.[columnIndex - 1] ?? parentColumn?.items[0]?.type)
            : null;
        const parentConfig = parentType ? typeConfigs[parentType] : undefined;
        const isActiveColumn = activeColumnIndex === columnIndex;
        const parentSelectionCount = parentColumn?.selectedIds.length ?? 0;

        return (
          <div
            key={`${columnType ?? "column"}-${columnIndex}`}
            className={cn(
              "flex h-full min-h-0 w-72 shrink-0 flex-col border-r",
              config?.columnClassName,
            )}
          >
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {config?.columnTitle ?? "Items"}
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
      {renderTrailing ? renderTrailing(selectionState) : null}
    </div>
  );
}
