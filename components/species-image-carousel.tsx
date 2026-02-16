"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Lightbox, {
  LightboxExternalProps,
  type Slide,
  type ControllerRef,
  type ZoomRef,
} from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Inline from "yet-another-react-lightbox/plugins/inline";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";

import type { SpeciesImage } from "@/lib/types";
import {
  getLocalizedText,
  getSpeciesImageUrl,
} from "@/lib/content/content-display";
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
  /** Controlled active slide index for external navigation. */
  activeIndex?: number;
  /** Callback when an image is clicked. */
  onImageClick?: (index: number) => void;
  /** Whether to enable the full-viewport modal on image click. */
  enableModal?: boolean;
  /** Callback fired when the full-size modal open state changes. */
  onModalOpenChange?: (open: boolean) => void;
  /** Lightbox props for the embedded version */
  embeddedLightboxProps?: LightboxExternalProps;
  /** Lightbox props for the full-screen version */
  fullScreenLightboxProps?: LightboxExternalProps;
}

type CarouselState = {
  key: string;
  currentImageIndex: number;
  isLightboxOpen: boolean;
};

function createDefaultCarouselState(key: string): CarouselState {
  return {
    key,
    currentImageIndex: 0,
    isLightboxOpen: false,
  };
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
  activeIndex,
  onImageClick,
  enableModal = true,
  onModalOpenChange,
  embeddedLightboxProps,
  fullScreenLightboxProps,
}: SpeciesImageCarouselProps) {
  const { language } = useLanguagePreference();
  const preferredLanguage = toLanguageCode(language);
  const [carouselState, setCarouselState] = useState<CarouselState>(() =>
    createDefaultCarouselState(
      resetKey ?? images.map((image) => image.id).join("-"),
    ),
  );
  const inlineControllerRef = useRef<ControllerRef | null>(null);
  const modalControllerRef = useRef<ControllerRef | null>(null);
  const modalZoomRef = useRef<ZoomRef | null>(null);
  const lightboxKey = useMemo(
    () => resetKey ?? images.map((image) => image.id).join("-"),
    [resetKey, images],
  );
  const slides = useMemo<Slide[]>(() => {
    const nextSlides: Slide[] = [];
    for (const image of images) {
      const src = getSpeciesImageUrl(image);
      if (!src) {
        continue;
      }

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

      nextSlides.push({
        src,
        alt,
        title: caption || alt,
        description: rightsOwner || undefined,
        thumbnail,
      });
    }
    return nextSlides;
  }, [alt, images, preferredLanguage]);

  const normalizedCarouselState =
    carouselState.key === lightboxKey
      ? carouselState
      : createDefaultCarouselState(lightboxKey);
  const currentImageIndex =
    slides.length > 0
      ? Math.min(
          Math.max(activeIndex ?? normalizedCarouselState.currentImageIndex, 0),
          slides.length - 1,
        )
      : 0;
  const isLightboxOpen = normalizedCarouselState.isLightboxOpen;

  useEffect(() => {
    onModalOpenChange?.(isLightboxOpen);
  }, [isLightboxOpen, onModalOpenChange]);

  const handleView = ({ index }: { index: number }) => {
    setCarouselState((prev) => {
      const normalized =
        prev.key === lightboxKey
          ? prev
          : createDefaultCarouselState(lightboxKey);
      if (normalized.currentImageIndex === index) {
        return prev.key === lightboxKey ? prev : normalized;
      }
      onIndexChange?.(index);
      return {
        ...normalized,
        currentImageIndex: index,
      };
    });
  };

  const handleClick = () => {
    onImageClick?.(currentImageIndex);
    if (enableModal) {
      setCarouselState((prev) => {
        const normalized =
          prev.key === lightboxKey
            ? prev
            : createDefaultCarouselState(lightboxKey);
        if (normalized.isLightboxOpen) {
          return prev.key === lightboxKey ? prev : normalized;
        }
        return {
          ...normalized,
          isLightboxOpen: true,
        };
      });
    }
  };

  const closeLightbox = useCallback(() => {
    setCarouselState((prev) => {
      const normalized =
        prev.key === lightboxKey
          ? prev
          : createDefaultCarouselState(lightboxKey);
      if (!normalized.isLightboxOpen) {
        return prev.key === lightboxKey ? prev : normalized;
      }
      return {
        ...normalized,
        isLightboxOpen: false,
      };
    });
  }, [lightboxKey]);

  const resolvedFullScreenLightboxProps = useMemo(
    () => ({
      ...fullScreenLightboxProps,
      zoom: {
        keyboardMoveDistance: 75,
        ...(fullScreenLightboxProps?.zoom ?? {}),
        ref: modalZoomRef,
      },
    }),
    [fullScreenLightboxProps],
  );

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
      const lowerKey = event.key.toLowerCase();
      if (
        event.key !== "ArrowLeft" &&
        event.key !== "ArrowRight" &&
        lowerKey !== "z" &&
        lowerKey !== "x"
      )
        return;
      if (isEditableTarget(event.target)) return;

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const controller = isLightboxOpen
          ? modalControllerRef.current
          : inlineControllerRef.current;
        if (!controller) return;

        // Change the picture even if the lightbox doesn't have to focus
        if (event.target === document.body) {
          event.preventDefault();
          if (event.key === "ArrowLeft") {
            controller.prev();
          } else {
            controller.next();
          }
          controller.focus();
        }
      }

      if (lowerKey === "z") {
        if (isLightboxOpen) {
          event.preventDefault();
          const modalZoom = modalZoomRef.current;
          if (modalZoom && !modalZoom.disabled) {
            modalZoom.zoomIn();
          }
          modalControllerRef.current?.focus();
        } else if (enableModal) {
          event.preventDefault();
          setCarouselState((prev) => {
            const normalized =
              prev.key === lightboxKey
                ? prev
                : createDefaultCarouselState(lightboxKey);
            if (normalized.isLightboxOpen) {
              return prev.key === lightboxKey ? prev : normalized;
            }
            return {
              ...normalized,
              isLightboxOpen: true,
            };
          });
          inlineControllerRef.current?.focus();
        }
      } else if (lowerKey === "x") {
        if (isLightboxOpen) {
          event.preventDefault();
          const modalZoom = modalZoomRef.current;
          const canZoomOut =
            modalZoom !== null &&
            !modalZoom.disabled &&
            modalZoom.zoom - modalZoom.minZoom > 0.001;
          if (canZoomOut) {
            modalZoom.zoomOut();
            modalControllerRef.current?.focus();
          } else {
            closeLightbox();
          }
        } else {
          closeLightbox();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [closeLightbox, enableModal, isLightboxOpen, lightboxKey]);

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
          index={currentImageIndex}
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
          close={closeLightbox}
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
          {...resolvedFullScreenLightboxProps}
        />
      )}
    </>
  );
}
