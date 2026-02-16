"use client";

import Image from "next/image";
import { Eye, EyeOff, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Species } from "@/lib/types";
import {
  getLocalizedText,
  getSpeciesImageUrl,
} from "@/lib/content/content-display";
import { cn } from "@/lib/utils";

/** Props for rendering the horizontal content of a species card. */
export interface ManageSpeciesCardHorizontalContentProps {
  /** Species item to display. */
  species: Species;
  /** Visual layout variant for the content. */
  variant?: "detailed" | "minimal";
  /** Called when the edit action is clicked. */
  onEdit: (species: Species) => void;
  /** Called when the delete action is clicked. */
  onDelete: (id: string) => void;
  /** Called when toggling species visibility. */
  onToggleVisibility: (species: Species) => void;
  /** Called when toggling test image availability. */
  onToggleTestImage?: (species: Species, imageId: string) => void;
}

/** Horizontal content block for a species entry, suitable for multiple containers. */
export function ManageSpeciesCardHorizontalContent({
  species,
  variant = "detailed",
  onEdit,
  onDelete,
  onToggleVisibility,
  onToggleTestImage,
}: ManageSpeciesCardHorizontalContentProps) {
  const finnishName = getLocalizedText(species.data.vernacularName, "fi");
  const englishName = getLocalizedText(species.data.vernacularName, "en");
  const images = species.data.images ?? [];
  const isHidden = species.isHidden ?? false;
  const testImageIds = species.testImageIds ?? [];

  const isMinimal = variant === "minimal";

  if (isMinimal) {
    return (
      <div className="flex items-center gap-2">
        <div className="grow-0 min-w-0">
          <h3
            className={cn(
              "truncate text-sm font-semibold",
              isHidden && "line-through text-muted-foreground",
            )}
          >
            {species.data.scientificName}
          </h3>
        </div>
        <div className="flex gap-1 items-center flex-shrink-0">
          <Button
            size="icon-xs"
            variant="minimal"
            className="rounded-xs"
            onClick={() => onEdit(species)}
          >
            <Pencil className="size-3" />
          </Button>
          <Button
            size="icon-xs"
            variant="minimal"
            className="rounded-xs"
            onClick={() => onToggleVisibility(species)}
            aria-label={isHidden ? "Make species public" : "Hide species"}
            title={isHidden ? "Make public" : "Hide"}
          >
            {isHidden ? (
              <Eye className="size-3" />
            ) : (
              <EyeOff className="size-3" />
            )}
          </Button>
          <Button
            size="icon-xs"
            variant="minimal-destructive"
            className="rounded-xs"
            onClick={() => onDelete(species.id)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-1">
            {species.data.scientificName}
          </h3>
          {isHidden && (
            <p className="text-xs font-medium text-muted-foreground">Hidden</p>
          )}
          {finnishName && (
            <p className="text-muted-foreground">{finnishName}</p>
          )}
          {englishName && (
            <p className="text-muted-foreground text-sm">{englishName}</p>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <Button size="icon" variant="outline" onClick={() => onEdit(species)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => onToggleVisibility(species)}
            aria-label={isHidden ? "Make species public" : "Hide species"}
            title={isHidden ? "Make public" : "Hide"}
          >
            {isHidden ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="destructive"
            onClick={() => onDelete(species.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {images.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-3 overscroll-x-contain touch-pan-x">
          {images.map((image, index) => {
            const isEnabled =
              testImageIds.length === 0 || testImageIds.includes(image.id);

            return (
              <button
                key={image.id}
                type="button"
                className="group relative h-20 w-28 shrink-0 overflow-hidden rounded-sm border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onToggleTestImage?.(species, image.id)}
                aria-pressed={isEnabled}
                aria-label={`Toggle test image ${index + 1}`}
              >
                <Image
                  src={
                    getSpeciesImageUrl(image, { preferThumbnail: true }) ||
                    "/placeholder.svg"
                  }
                  alt={`${species.data.scientificName} image ${index + 1}`}
                  fill
                  className={cn(
                    "object-contain transition-opacity",
                    !isEnabled && "opacity-40",
                  )}
                />
                {!isEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/20">
                    <X className="h-6 w-6 text-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No images uploaded yet.</p>
      )}
    </div>
  );
}
