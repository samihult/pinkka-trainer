"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Lightbox, {
  LightboxExternalProps,
  type Slide,
  type ControllerRef,
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
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";

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
  const { language } = useLanguagePreference();
  const preferredLanguage = toLanguageCode(language);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const inlineControllerRef = useRef<ControllerRef | null>(null);
  const modalControllerRef = useRef<ControllerRef | null>(null);
  const lightboxKey = useMemo(
    () => resetKey ?? images.map((image) => image.id).join("-"),
    [resetKey, images],
  );
  const slides = useMemo<Slide[]>(() => {
    return images
      .map((image) => {
        const src = getSpeciesImageUrl(image);
        if (!src) return null;
        const caption = getLocalizedText(image.caption, preferredLanguage);
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
  }, [alt, images, preferredLanguage]);

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
    setCurrentImageIndex((prev) => {
      if (prev === index) return prev;
      onIndexChange?.(index);
      return index;
    });
  };

  const handleClick = () => {
    onImageClick?.(currentImageIndex);
    if (enableModal) {
      setIsLightboxOpen(true);
    }
  };

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        target.isContentEditable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT"
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (
        event.key !== "ArrowLeft" &&
        event.key !== "ArrowRight" &&
        event.key !== "ArrowUp" &&
        event.key !== "ArrowDown"
      )
        return;
      if (isEditableTarget(event.target)) return;

      const controller = isLightboxOpen
        ? modalControllerRef.current
        : inlineControllerRef.current;
      if (!controller) return;

      // Change the picture even if the lightbox doesn't have to focus
      if (event.target === document.body) {
        event.preventDefault();
        if (event.key === "ArrowLeft") {
          controller.prev();
        } else if (event.key === "ArrowRight") {
          controller.next();
        }
        controller.focus();
      }

      if (event.key === "ArrowUp") {
        if (enableModal) {
          setIsLightboxOpen(true);
        }
        controller.focus();
      } else if (event.key === "ArrowDown") {
        setIsLightboxOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isLightboxOpen]);

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
          key={lightboxKey}
          slides={slides}
          on={{ view: handleView, click: handleClick }}
          inline={{ className: "h-full w-full" }}
          controller={{ focus: true, ref: inlineControllerRef }}
          carousel={{
            imageFit: "contain",
            padding: 0,
          }}
          toolbar={{ buttons: [] }}
          captions={{ hidden: true, showToggle: false }}
          thumbnails={{ showToggle: false, hidden: true }}
          plugins={[Inline, Captions, Thumbnails]}
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
          controller={{ ref: modalControllerRef }}
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
