"use client";

import type React from "react";

import Image from "next/image";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Species } from "@/lib/types";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";
import { getSpeciesImageUrl } from "@/lib/pinkka/pinkka-display";

/** Props for rendering a draggable species management card. */
export interface ManageSpeciesCardProps {
  /** Species item to display. */
  species: Species;
  /** Position index used for drag-and-drop ordering. */
  index: number;
  /** Called when dragging starts. */
  onDragStart: (index: number) => void;
  /** Called when the card is dragged over another index. */
  onDragOver: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  /** Called when dragging ends. */
  onDragEnd: () => void;
  /** Called when the edit action is clicked. */
  onEdit: (species: Species) => void;
  /** Called when the delete action is clicked. */
  onDelete: (id: string) => void;
}

/** Draggable card row for a single species entry in the management list. */
export function ManageSpeciesCard({
  species,
  index,
  onDragStart,
  onDragOver,
  onDragEnd,
  onEdit,
  onDelete,
}: ManageSpeciesCardProps) {
  const finnishName = getLocalizedText(species.data.vernacularName, "fi");
  const englishName = getLocalizedText(species.data.vernacularName, "en");
  const image = species.data.images?.[0];

  return (
    <Card
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(event) => onDragOver(event, index)}
      onDragEnd={onDragEnd}
      className="cursor-move hover:shadow-md transition-shadow py-4"
    >
      <CardContent className="px-4">
        <div className="flex gap-4">
          <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />

          {image && (
            <div className="relative w-24 h-24 rounded-xs overflow-hidden flex-shrink-0">
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
            {finnishName && (
              <p className="text-muted-foreground">{finnishName}</p>
            )}
            {englishName && (
              <p className="text-muted-foreground text-sm">{englishName}</p>
            )}
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <Button
              size="icon"
              variant="outline"
              onClick={() => onEdit(species)}
            >
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
      </CardContent>
    </Card>
  );
}
