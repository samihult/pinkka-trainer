"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ZoomIn } from "lucide-react";

import type { SpeciesImage } from "@/lib/types";
import { getSpeciesImageUrl } from "@/lib/pinkka/pinkka-display";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

/** Props for the species image carousel. */
export interface SpeciesImageCarouselProps {
  /** Images to show in the carousel. */
  images: SpeciesImage[];
  /** Accessible alt text for the image content. */
  alt: string;
  /** Optional reset key to reset the carousel when the species changes. */
  resetKey?: string;
  /** Optional container class name. */
  className?: string;
  /** Optional height class for the carousel region. */
  heightClassName?: string;
  /** Optional image class name override. */
  imageClassName?: string;
  /** Whether to show pagination dots. */
  showPagination?: boolean;
  /** Message shown when no images are available. */
  emptyMessage?: string;
  /** Callback when the active index changes. */
  onIndexChange?: (index: number) => void;
  /** Callback when an image is clicked. */
  onImageClick?: (index: number) => void;
}

/** Carousel for displaying species images with lazy loading and pagination. */
export function SpeciesImageCarousel({
  images,
  alt,
  resetKey,
  className,
  heightClassName = "h-[500px]",
  imageClassName = "object-cover",
  showPagination = true,
  emptyMessage = "No image available",
  onIndexChange,
  onImageClick,
}: SpeciesImageCarouselProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [loadedSlides, setLoadedSlides] = useState<boolean[]>([]);
  const loadedSlidesRef = useRef<Set<number>>(new Set());
  const imageCount = images.length;
  const isInteractive = Boolean(onImageClick);
  const carouselKey = useMemo(
    () => resetKey ?? images.map((image) => image.id).join("-"),
    [resetKey, images],
  );

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
    },
    [imageCount],
  );

  useEffect(() => {
    if (!carouselApi) return;
    const updateSelected = () => {
      const nextIndex = carouselApi.selectedScrollSnap();
      setCurrentImageIndex(nextIndex);
      onIndexChange?.(nextIndex);
    };
    updateSelected();
    carouselApi.on("select", updateSelected);
    carouselApi.on("reInit", updateSelected);
    return () => {
      carouselApi.off("select", updateSelected);
      carouselApi.off("reInit", updateSelected);
    };
  }, [carouselApi, onIndexChange]);

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
  }, [imageCount, resetKey, carouselApi, lazyLoadImages]);

  if (imageCount === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          heightClassName,
          className,
        )}
      >
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", heightClassName, className)}>
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
              <CarouselItem key={image.id ?? index} className="h-full">
                {isInteractive ? (
                  <button
                    type="button"
                    className={cn(
                      "group relative h-full w-full cursor-zoom-in",
                      heightClassName,
                    )}
                    onClick={() => onImageClick?.(index)}
                    aria-label="Open image"
                  >
                    <img
                      src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
                      data-src={url}
                      alt={alt}
                      className={cn(
                        "h-full w-full opacity-0 transition-opacity duration-300 data-[loaded=true]:opacity-100",
                        imageClassName,
                      )}
                      decoding="async"
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <span className="rounded-full bg-black/55 p-3 text-white shadow-sm">
                        <ZoomIn className="h-5 w-5" />
                      </span>
                    </span>
                    <div
                      className={`absolute inset-0 flex items-center justify-center bg-muted/70 text-sm text-muted-foreground transition-opacity duration-300 ${
                        isLoaded ? "opacity-0" : "opacity-100"
                      }`}
                      aria-hidden={isLoaded}
                    >
                      Loading image…
                    </div>
                  </button>
                ) : (
                  <div className={cn("relative h-full", heightClassName)}>
                    <img
                      src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
                      data-src={url}
                      alt={alt}
                      className={cn(
                        "h-full w-full opacity-0 transition-opacity duration-300 data-[loaded=true]:opacity-100",
                        imageClassName,
                      )}
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
                )}
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

      {imageCount > 1 && showPagination && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={(event) => {
                event.stopPropagation();
                carouselApi?.scrollTo(idx);
              }}
              className={`h-2 rounded-full transition-all ${
                idx === currentImageIndex ? "w-8 bg-white" : "w-2 bg-white/50"
              }`}
              aria-label={`Show image ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
