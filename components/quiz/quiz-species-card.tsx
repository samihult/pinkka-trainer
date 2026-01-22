"use client";

import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

/** Props for the QuizSpeciesCard component. */
export interface QuizSpeciesCardProps {
  /** Image URL chosen for the quiz prompt. */
  imageUrl: string | null;
}

/** Renders the quiz prompt image card for the current species. */
export function QuizSpeciesCard({ imageUrl }: QuizSpeciesCardProps) {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-4 text-center">
          What species is shown in this image?
        </h2>

        {imageUrl ? (
          <div className="relative h-80 rounded-lg overflow-hidden mb-4">
            <Image
              src={imageUrl}
              alt="Species to identify"
              fill
              className="object-contain"
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
