"use client";

import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

/** Props for the TestSpeciesCard component. */
export interface TestSpeciesCardProps {
  /** Image URL chosen for the test prompt. */
  imageUrl: string | null;
}

/** Renders the test prompt image card for the current species. */
export function TestSpeciesCard({ imageUrl }: TestSpeciesCardProps) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-4 p-6">
        <h2 className="text-2xl font-semibold text-center">
          What species is shown in this image?
        </h2>

        {imageUrl ? (
          <div className="relative flex-1 rounded-lg overflow-hidden">
            <Image
              src={imageUrl}
              alt="Species to identify"
              fill
              className="object-contain"
              priority
            />
          </div>
        ) : (
          <div className="flex-1 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">No image available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
