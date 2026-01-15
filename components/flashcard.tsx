"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Species } from "@/lib/types";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";
import { getSpeciesDescription } from "@/lib/pinkka/pinkka-display";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { SpeciesImageCarousel } from "@/components/species-image-carousel";

/** Props for the flashcard viewer. */
interface FlashcardProps {
  /** Species displayed on the card. */
  species: Species;
  /** Advance to the next card. */
  onNext: () => void;
  /** Navigate to the previous card. */
  onPrevious: () => void;
  /** Zero-based index of the current card. */
  currentIndex: number;
  /** Total number of cards in the session. */
  total: number;
}

/** Interactive flashcard with flip and image navigation controls. */
export function Flashcard({
  species,
  onNext,
  onPrevious,
  currentIndex,
  total,
}: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => setFlipped(!flipped);

  const handleNext = () => {
    setFlipped(false);
    onNext();
  };

  const handlePrevious = () => {
    setFlipped(false);
    onPrevious();
  };

  const images = species.data.images ?? [];
  const finnishName = getLocalizedText(species.data.vernacularName, "fi");
  const englishName = getLocalizedText(species.data.vernacularName, "en");
  const description = getSpeciesDescription(species.data, "fi");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 text-center text-sm text-muted-foreground">
        Card {currentIndex + 1} of {total}
      </div>

      <Card
        className="min-h-[500px] relative overflow-hidden cursor-pointer"
        onClick={handleFlip}
      >
        <CardContent className="p-0 h-full">
          <div
            className={`transition-all duration-500 ${flipped ? "opacity-0" : "opacity-100"}`}
          >
            {/* Front - Image */}
            <SpeciesImageCarousel
              images={images}
              alt={species.data.scientificName}
              resetKey={species.id}
              heightClassName="h-[500px]"
            />
          </div>

          <div
            className={`absolute inset-0 bg-card p-8 flex flex-col justify-center transition-all duration-500 ${
              flipped ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Back - Information */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  {species.data.scientificName}
                </h2>
                <div className="space-y-1">
                  {finnishName && (
                    <p className="text-xl text-primary">
                      Finnish: {finnishName}
                    </p>
                  )}
                  {englishName && (
                    <p className="text-xl text-accent">
                      English: {englishName}
                    </p>
                  )}
                </div>
              </div>

              {description && (
                <div className="pt-4 border-t">
                  <p className="text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <Button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          variant="outline"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <Button onClick={handleFlip} variant="outline">
          <RotateCw className="mr-2 h-4 w-4" />
          Flip Card
        </Button>

        <Button onClick={handleNext} disabled={currentIndex === total - 1}>
          Next
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
