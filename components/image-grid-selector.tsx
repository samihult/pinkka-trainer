"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Selectable image item rendered in the grid selector. */
export interface ImageGridSelectorItem {
  /** Stable identifier returned by selection events. */
  id: string;
  /** Image source URL. */
  src: string;
  /** Accessible image description. */
  alt: string;
  /** Optional image label shown under the thumbnail. */
  label?: string;
}

/** Props for the reusable image grid selector. */
export interface ImageGridSelectorProps {
  /** Candidate images rendered in the selector grid. */
  items: ImageGridSelectorItem[];
  /** Controlled list of selected image ids. */
  selectedIds: string[];
  /** Called whenever the selected ids change. */
  onSelectedIdsChange: (selectedIds: string[]) => void;
  /** Max amount of selected items allowed at once. */
  maxSelected: number;
  /** Empty-state message shown when there are no images. */
  emptyMessage: string;
  /** Accessible label for the image grid. */
  gridAriaLabel: string;
}

/** Reusable selectable image grid supporting single- and multi-selection limits. */
export function ImageGridSelector({
  items,
  selectedIds,
  onSelectedIdsChange,
  maxSelected,
  emptyMessage,
  gridAriaLabel,
}: ImageGridSelectorProps) {
  const normalizedSelectedIds = items
    .map((item) => item.id)
    .filter((id) => selectedIds.includes(id));

  const handleToggle = (imageId: string) => {
    const isSelected = normalizedSelectedIds.includes(imageId);
    if (isSelected) {
      onSelectedIdsChange(normalizedSelectedIds.filter((id) => id !== imageId));
      return;
    }

    if (maxSelected <= 1) {
      onSelectedIdsChange([imageId]);
      return;
    }

    if (normalizedSelectedIds.length >= maxSelected) {
      return;
    }

    onSelectedIdsChange([...normalizedSelectedIds, imageId]);
  };

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      role="listbox"
      aria-label={gridAriaLabel}
      aria-multiselectable={maxSelected > 1}
      className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3"
    >
      {items.map((item) => {
        const isSelected = normalizedSelectedIds.includes(item.id);
        const reachedSelectionLimit =
          normalizedSelectedIds.length >= maxSelected && !isSelected;

        return (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => handleToggle(item.id)}
            disabled={reachedSelectionLimit}
            className={cn(
              "rounded-md border border-border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              isSelected
                ? "ring-2 ring-primary"
                : "hover:border-primary/50 hover:bg-accent/20",
            )}
          >
            <div className="relative aspect-square overflow-hidden rounded-md border border-border/70 bg-muted/20">
              <Image
                src={item.src}
                alt={item.alt}
                fill
                className="object-cover"
              />
              {isSelected ? (
                <span className="absolute right-1 top-1 rounded-full bg-primary p-1 text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              ) : null}
            </div>
            {item.label ? (
              <p className="mt-2 text-xs text-muted-foreground">{item.label}</p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
