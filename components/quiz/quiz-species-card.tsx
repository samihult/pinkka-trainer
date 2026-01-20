"use client";

import { Card, CardContent } from "@/components/ui/card";
import { getSpeciesImageUrl } from "@/lib/pinkka/pinkka-display";
import type { Species } from "@/lib/types";
import Image from "next/image";

/** Props for the QuizSpeciesCard component. */
export interface QuizSpeciesCardProps {
  /** Species shown in the quiz prompt. */
  species: Species;
}

/** Renders the quiz prompt image card for the current species. */
export function QuizSpeciesCard({ species }: QuizSpeciesCardProps) {
  const image =
    species.data.images && species.data.images.length > 0
      ? getSpeciesImageUrl(species.data.images[0]) || "/placeholder.svg"
      : null;

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-4 text-center">
          What species is shown in this image?
        </h2>

        {image ? (
          <div className="relative h-80 rounded-lg overflow-hidden mb-4">
            <Image
              src={image}
              alt="Species to identify"
              fill
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div className="h-80 bg-muted rounded-lg flex items-center justify-center mb-4">
            <p className="text-muted-foreground">No image available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
