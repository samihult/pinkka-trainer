"use client";

import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Species } from "@/lib/types";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";
import { getSpeciesImageUrl } from "@/lib/pinkka/pinkka-display";

/** Props for rendering the horizontal content of a species card. */
export interface ManageSpeciesCardHorizontalContentProps {
  /** Species item to display. */
  species: Species;
  /** Visual layout variant for the content. */
  variant?: "default" | "minimal";
  /** Called when the edit action is clicked. */
  onEdit: (species: Species) => void;
  /** Called when the delete action is clicked. */
  onDelete: (id: string) => void;
}

/** Horizontal content block for a species entry, suitable for multiple containers. */
export function ManageSpeciesCardHorizontalContent({
  species,
  variant = "default",
  onEdit,
  onDelete,
}: ManageSpeciesCardHorizontalContentProps) {
  const finnishName = getLocalizedText(species.data.vernacularName, "fi");
  const englishName = getLocalizedText(species.data.vernacularName, "en");
  const image = species.data.images?.[0];

  const isMinimal = variant === "minimal";

  if (isMinimal) {
    return (
      <div className="flex items-center gap-2">
        <div className="grow-0 min-w-0">
          <h3 className="truncate text-sm font-semibold">
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
    <div className="flex gap-4">
      {image && (
        <div className="relative w-24 h-24 rounded-sm overflow-hidden flex-shrink-0">
          <Image
            src={getSpeciesImageUrl(image) || "/placeholder.svg"}
            alt={species.data.scientificName}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-lg mb-1">
          {species.data.scientificName}
        </h3>
        {finnishName && <p className="text-muted-foreground">{finnishName}</p>}
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
          variant="destructive"
          onClick={() => onDelete(species.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
