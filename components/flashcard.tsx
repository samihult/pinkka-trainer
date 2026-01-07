"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Species } from "@/lib/types";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import Image from "next/image";

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleFlip = () => setFlipped(!flipped);

  const handleNextImage = () => {
    if (species.images && currentImageIndex < species.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const handlePreviousImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const handleNext = () => {
    setFlipped(false);
    setCurrentImageIndex(0);
    onNext();
  };

  const handlePrevious = () => {
    setFlipped(false);
    setCurrentImageIndex(0);
    onPrevious();
  };

  const currentImage = species.images?.[currentImageIndex];

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
            {currentImage ? (
              <div className="relative h-[500px]">
                <Image
                  src={currentImage.url || "/placeholder.svg"}
                  alt={species.scientificName}
                  fill
                  className="object-cover"
                  priority
                />

                {species.images && species.images.length > 1 && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    {species.images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(idx);
                        }}
                        className={`h-2 rounded-full transition-all ${
                          idx === currentImageIndex
                            ? "w-8 bg-white"
                            : "w-2 bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[500px] flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">No image available</p>
              </div>
            )}
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
                  {species.scientificName}
                </h2>
                <div className="space-y-1">
                  {species.finnishName && (
                    <p className="text-xl text-primary">
                      Finnish: {species.finnishName}
                    </p>
                  )}
                  {species.englishName && (
                    <p className="text-xl text-accent">
                      English: {species.englishName}
                    </p>
                  )}
                </div>
              </div>

              {species.description && (
                <div className="pt-4 border-t">
                  <p className="text-muted-foreground leading-relaxed">
                    {species.description}
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
