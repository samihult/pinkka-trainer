"use client";

import { useEffect, useMemo, useState } from "react";
import Lightbox, {
  LightboxExternalProps,
  type Slide,
} from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Inline from "yet-another-react-lightbox/plugins/inline";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";

import type { SpeciesImage } from "@/lib/types";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";
import { getSpeciesImageUrl } from "@/lib/pinkka/pinkka-display";
import { cn } from "@/lib/utils";

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
  /** Whether to show pagination dots. */
  showPagination?: boolean;
  /** Message shown when no images are available. */
  emptyMessage?: string;
  /** Callback when the active index changes. */
  onIndexChange?: (index: number) => void;
  /** Callback when an image is clicked. */
  onImageClick?: (index: number) => void;
  /** Whether to enable the full-viewport modal on image click. */
  enableModal?: boolean;
  /** Lightbox props for the embedded version */
  embeddedLightboxProps?: LightboxExternalProps;
  /** Lightbox props for the full-screen version */
  fullScreenLightboxProps?: LightboxExternalProps;
}

/** Carousel for displaying species images with lightbox controls. */
export function SpeciesImageCarousel({
  images,
  alt,
  resetKey,
  className,
  heightClassName = "h-[500px]",
  showPagination = true,
  emptyMessage = "No image available",
  onIndexChange,
  onImageClick,
  enableModal = true,
  embeddedLightboxProps,
  fullScreenLightboxProps,
}: SpeciesImageCarouselProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const slides = useMemo<Slide[]>(() => {
    return images
      .map((image) => {
        const src = getSpeciesImageUrl(image);
        if (!src) return null;
        const caption =
          getLocalizedText(image.caption, "en") ||
          getLocalizedText(image.caption, "fi") ||
          "";
        const rightsOwner = image.meta?.rightsOwner
          ? `(c) ${image.meta.rightsOwner}`
          : "";
        const thumbnail =
          image.urls?.thumbnail ||
          image.urls?.square ||
          image.urls?.large ||
          image.urls?.full ||
          image.urls?.original ||
          src;
        return {
          src,
          alt,
          title: caption || alt,
          description: rightsOwner || undefined,
          thumbnail,
        };
      })
      .filter((slide): slide is Slide => Boolean(slide));
  }, [alt, images]);

  useEffect(() => {
    setCurrentImageIndex(0);
    setIsLightboxOpen(false);
  }, [images.length, resetKey]);

  useEffect(() => {
    if (currentImageIndex >= slides.length && slides.length > 0) {
      setCurrentImageIndex(0);
    }
  }, [currentImageIndex, slides.length]);

  const handleView = ({ index }: { index: number }) => {
    setCurrentImageIndex(index);
    onIndexChange?.(index);
  };

  const handleClick = () => {
    onImageClick?.(currentImageIndex);
    if (enableModal) {
      setIsLightboxOpen(true);
    }
  };

  if (slides.length === 0) {
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
    <>
      <div className={cn("w-full", heightClassName, className)}>
        <Lightbox
          slides={slides}
          index={currentImageIndex}
          on={{ view: handleView, click: handleClick }}
          inline={{ className: "h-full w-full" }}
          carousel={{
            imageFit: "contain",
            padding: 0,
          }}
          toolbar={{ buttons: [] }}
          captions={{ hidden: true, showToggle: false }}
          thumbnails={{ showToggle: false, hidden: true }}
          plugins={[Inline, Captions, Thumbnails, Zoom]}
          {...embeddedLightboxProps}
        />
      </div>
      {enableModal && (
        <Lightbox
          open={isLightboxOpen}
          close={() => setIsLightboxOpen(false)}
          slides={slides}
          index={currentImageIndex}
          on={{ view: handleView }}
          toolbar={{ buttons: ["zoom", "close"] }}
          captions={{ showToggle: false }}
          thumbnails={{ showToggle: false, hidden: !showPagination }}
          counter={{
            container: {
              style: {
                position: "absolute",
                top: "unset",
                bottom: 0,
                color: "var(--background)",
                backgroundColor: "black",
              },
              className: "absolute px-3 py-1 rounded-sm",
            },
          }}
          plugins={[Captions, Thumbnails, Zoom, Counter]}
          {...fullScreenLightboxProps}
        />
      )}
    </>
  );
}
