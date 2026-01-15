"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Species } from "@/lib/types";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";
import {
  getSpeciesDescription,
  getSpeciesImageUrl,
} from "@/lib/pinkka/pinkka-display";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

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
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);

  const handleFlip = () => setFlipped(!flipped);

  const handleNext = () => {
    setFlipped(false);
    setCurrentImageIndex(0);
    carouselApi?.scrollTo(0);
    onNext();
  };

  const handlePrevious = () => {
    setFlipped(false);
    setCurrentImageIndex(0);
    carouselApi?.scrollTo(0);
    onPrevious();
  };

  const images = species.data.images ?? [];
  const imageCount = images.length;
  const finnishName = getLocalizedText(species.data.vernacularName, "fi");
  const englishName = getLocalizedText(species.data.vernacularName, "en");
  const description = getSpeciesDescription(species.data, "fi");

  useEffect(() => {
    if (!carouselApi) return;
    const updateSelected = () => {
      setCurrentImageIndex(carouselApi.selectedScrollSnap());
    };
    updateSelected();
    carouselApi.on("select", updateSelected);
    carouselApi.on("reInit", updateSelected);
    return () => {
      carouselApi.off("select", updateSelected);
      carouselApi.off("reInit", updateSelected);
    };
  }, [carouselApi]);

  useEffect(() => {
    setCurrentImageIndex(0);
    carouselApi?.scrollTo(0);
  }, [species.id, carouselApi]);

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
            {imageCount > 0 ? (
              <div className="relative h-[500px]">
                <Carousel
                  className="h-full"
                  setApi={setCarouselApi}
                  opts={{ align: "start" }}
                >
                  <CarouselContent className="h-full">
                    {images.map((image, index) => {
                      const url = getSpeciesImageUrl(image);
                      if (!url) return null;
                      return (
                        <CarouselItem key={index} className="h-full">
                          <div className="relative h-[500px]">
                            <Image
                              src={url || "/placeholder.svg"}
                              alt={species.data.scientificName}
                              fill
                              className="object-cover"
                              priority={index === 0}
                            />
                          </div>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  {imageCount > 1 && (
                    <>
                      <CarouselPrevious className="left-3 h-9 w-9 bg-black/40 text-white hover:bg-black/60" />
                      <CarouselNext className="right-3 h-9 w-9 bg-black/40 text-white hover:bg-black/60" />
                    </>
                  )}
                </Carousel>

                {imageCount > 1 && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          carouselApi?.scrollTo(idx);
                        }}
                        className={`h-2 rounded-full transition-all ${
                          idx === currentImageIndex
                            ? "w-8 bg-white"
                            : "w-2 bg-white/50"
                        }`}
                        aria-label={`Show image ${idx + 1}`}
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
