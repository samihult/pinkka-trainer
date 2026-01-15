"use client";

import * as React from "react";
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Carousel API type from Embla. */
export type CarouselApi = UseEmblaCarouselType[1];

type CarouselContextProps = {
  /** Carousel viewport ref callback from Embla. */
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  /** Embla API instance. */
  api: CarouselApi;
  /** Scroll to the previous slide. */
  scrollPrev: () => void;
  /** Scroll to the next slide. */
  scrollNext: () => void;
  /** Whether previous scroll is possible. */
  canScrollPrev: boolean;
  /** Whether next scroll is possible. */
  canScrollNext: boolean;
};

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

const useCarousel = () => {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }
  return context;
};

/** Root carousel wrapper and Embla provider. */
export const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /** Embla options. */
    opts?: Parameters<typeof useEmblaCarousel>[0];
    /** Embla plugins. */
    plugins?: Parameters<typeof useEmblaCarousel>[1];
    /** Optional callback for retrieving the Embla API. */
    setApi?: (api: CarouselApi) => void;
  }
>(({ className, opts, plugins, setApi, children, ...props }, ref) => {
  const [carouselRef, api] = useEmblaCarousel(opts, plugins);
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = React.useCallback(() => {
    api?.scrollNext();
  }, [api]);

  const handleSelect = React.useCallback(() => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, [api]);

  React.useEffect(() => {
    if (!api) return;
    handleSelect();
    api.on("select", handleSelect);
    api.on("reInit", handleSelect);
    return () => {
      api.off("select", handleSelect);
      api.off("reInit", handleSelect);
    };
  }, [api, handleSelect]);

  React.useEffect(() => {
    if (api && setApi) {
      setApi(api);
    }
  }, [api, setApi]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api,
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        ref={ref}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
});
Carousel.displayName = "Carousel";

/** Carousel viewport wrapper. */
export const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { carouselRef } = useCarousel();
  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div
        ref={ref}
        className={cn("flex", className)}
        {...props}
      />
    </div>
  );
});
CarouselContent.displayName = "CarouselContent";

/** Carousel slide item. */
export const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="group"
    aria-roledescription="slide"
    className={cn("min-w-0 shrink-0 grow-0 basis-full", className)}
    {...props}
  />
));
CarouselItem.displayName = "CarouselItem";

/** Button to move to the previous slide. */
export const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "ghost", size = "icon", ...props }, ref) => {
  const { scrollPrev, canScrollPrev } = useCarousel();
  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute -left-12 top-1/2 -translate-y-1/2 rounded-full",
        className,
      )}
      disabled={!canScrollPrev}
      onClick={(event) => {
        event.stopPropagation();
        scrollPrev();
      }}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  );
});
CarouselPrevious.displayName = "CarouselPrevious";

/** Button to move to the next slide. */
export const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "ghost", size = "icon", ...props }, ref) => {
  const { scrollNext, canScrollNext } = useCarousel();
  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute -right-12 top-1/2 -translate-y-1/2 rounded-full",
        className,
      )}
      disabled={!canScrollNext}
      onClick={(event) => {
        event.stopPropagation();
        scrollNext();
      }}
      {...props}
    >
      <ChevronRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  );
});
CarouselNext.displayName = "CarouselNext";
