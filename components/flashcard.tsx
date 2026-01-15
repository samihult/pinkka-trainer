"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Species } from "@/lib/types";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";
import {
  getSpeciesDescription,
  getSpeciesImageUrl,
} from "@/lib/pinkka/pinkka-display";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
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
  const [loadedSlides, setLoadedSlides] = useState<boolean[]>([]);
  const loadedSlidesRef = useRef<Set<number>>(new Set());

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

  const lazyLoadImages = useCallback(
    (api: CarouselApi) => {
    const slidesInView = api.slidesInView();
    const slideNodes = api.slideNodes();

    slidesInView.forEach((index) => {
      if (loadedSlidesRef.current.has(index)) return;
      const slide = slideNodes[index];
      const image = slide.querySelector<HTMLImageElement>("img[data-src]");
      if (!image) return;

      const src = image.getAttribute("data-src");
      const srcSet = image.getAttribute("data-srcset");

      if (src) image.setAttribute("src", src);
      if (srcSet) image.setAttribute("srcset", srcSet);
      image.removeAttribute("data-src");
      image.removeAttribute("data-srcset");
      const markLoaded = () => {
        image.setAttribute("data-loaded", "true");
        setLoadedSlides((prev) => {
          if (prev[index]) return prev;
          const next =
            prev.length === imageCount
              ? [...prev]
              : Array(imageCount).fill(false);
          next[index] = true;
          return next;
        });
      };

      if (image.complete) {
        markLoaded();
      } else {
        image.addEventListener("load", markLoaded, { once: true });
      }

      loadedSlidesRef.current.add(index);
    });
  }, [imageCount]);

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
    if (!carouselApi) return;
    const handleLazyLoad = (api: CarouselApi) => lazyLoadImages(api);
    lazyLoadImages(carouselApi);
    carouselApi.on("slidesInView", handleLazyLoad);
    carouselApi.on("reInit", handleLazyLoad);
    return () => {
      carouselApi.off("slidesInView", handleLazyLoad);
      carouselApi.off("reInit", handleLazyLoad);
    };
  }, [carouselApi, lazyLoadImages]);

  useEffect(() => {
    setCurrentImageIndex(0);
    loadedSlidesRef.current = new Set();
    setLoadedSlides(Array(imageCount).fill(false));
    carouselApi?.scrollTo(0);
    if (carouselApi) {
      lazyLoadImages(carouselApi);
    }
  }, [species.id, carouselApi, imageCount, lazyLoadImages]);

  const carouselKey = useMemo(() => species.id, [species.id]);

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
                  key={carouselKey}
                  className="h-full"
                  setApi={setCarouselApi}
                  opts={{ align: "start" }}
                >
                  <CarouselContent className="h-full">
                    {images.map((image, index) => {
                      const url = getSpeciesImageUrl(image);
                      const isLoaded = loadedSlides[index];
                      if (!url) return null;
                      return (
                        <CarouselItem key={index} className="h-full">
                          <div className="relative h-[500px]">
                            <img
                              src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
                              data-src={url}
                              alt={species.data.scientificName}
                              className="h-full w-full object-cover opacity-0 transition-opacity duration-300 data-[loaded=true]:opacity-100"
                              decoding="async"
                            />
                            <div
                              className={`absolute inset-0 flex items-center justify-center bg-muted/70 text-sm text-muted-foreground transition-opacity duration-300 ${
                                isLoaded ? "opacity-0" : "opacity-100"
                              }`}
                              aria-hidden={isLoaded}
                            >
                              Loading image…
                            </div>
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
