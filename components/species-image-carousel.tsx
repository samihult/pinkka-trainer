"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { animated, to, useSprings } from "@react-spring/web";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { LoadingSpinner } from "@/components/loading-spinner";
import type { SpeciesImage } from "@/lib/types";
import {
  getLocalizedText,
  getSpeciesImageUrl,
} from "@/lib/content/content-display";
import { cn } from "@/lib/utils";
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";

/** Props for the species image carousel. */
type LegacyLightboxProps = Record<string, unknown>;

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
  /** Optional viewport element used for fit and detached pan calculations. */
  viewportRef?: RefObject<HTMLElement | null>;
  /** Margin in pixels used when fitting zoom level 1 into viewport. */
  zoomViewportMargin?: number;
  /** Center frame in viewport when first zooming out of fit level. */
  centerFrameOnBreakout?: boolean;
  /** @deprecated No-op. Frame chain behavior has been removed. */
  showZoomedFrameChain?: boolean;
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
  /** Whether to enable pickup/zoom mode on image click. */
  enableModal?: boolean;
  /** Callback fired when pickup/zoom state changes. */
  onModalOpenChange?: (open: boolean) => void;
  /** Kept for backward-compatible API surface. */
  embeddedLightboxProps?: LegacyLightboxProps;
  /** Kept for backward-compatible API surface. */
  fullScreenLightboxProps?: LegacyLightboxProps;
}

type MediaKind = "image" | "video";

interface MediaSlide {
  id: string;
  src: string;
  caption: string;
  kind: MediaKind;
}

interface CarouselState {
  currentImageIndex: number;
  zoomLevel: number;
  zoomViewportMode: "frame" | "window";
  panX: number;
  panY: number;
  swipeOffsetX: number;
}

interface DragState {
  mode: "pan" | "swipe";
  pointerId: number;
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
  startSwipeOffsetX: number;
  moved: boolean;
}

interface ZoomFocusPoint {
  clientX: number;
  clientY: number;
}

interface ToggleZoomOptions {
  /** Center the frame in the viewport when entering breakout mode. */
  centerOnBreakout?: boolean;
  /** Which viewport to use for breakout centering and pan bounds. */
  viewportMode?: "frame" | "window";
}

interface IntrinsicMediaSize {
  height: number;
  width: number;
}

interface SlideSpringTarget {
  frameHeight: number;
  frameOpacity: number;
  frameScale: number;
  frameWidth: number;
  panX: number;
  panY: number;
}

const MIN_ZOOM_LEVEL = 0;
const DETACHED_ZOOM_LEVEL = 1;
const MAX_ZOOM_LEVEL = 1;
const DEFAULT_VIEWPORT_MARGIN = 24;
const ONE_TO_ONE_CLOSE_THRESHOLD = 1.12;
const FALLBACK_BREAKOUT_SCALE = 2;
const STRIP_BASE_GAP = 48;
const SIDE_FRAME_SCALE_NEAR = 0.62;
const SIDE_FRAME_SCALE_MID = 0.5;
const SIDE_FRAME_SCALE_FAR = 0.42;
const SWIPE_MOVE_THRESHOLD = 12;
const SWIPE_TRIGGER_DISTANCE = 48;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function interpolateFrameScale(distance: number): number {
  if (distance <= 0) return 1;
  if (distance < 1) {
    return 1 + (SIDE_FRAME_SCALE_NEAR - 1) * distance;
  }
  if (distance < 2) {
    return (
      SIDE_FRAME_SCALE_NEAR +
      (SIDE_FRAME_SCALE_MID - SIDE_FRAME_SCALE_NEAR) * (distance - 1)
    );
  }
  if (distance < 3) {
    return (
      SIDE_FRAME_SCALE_MID +
      (SIDE_FRAME_SCALE_FAR - SIDE_FRAME_SCALE_MID) * (distance - 2)
    );
  }
  return SIDE_FRAME_SCALE_FAR;
}

function createDefaultState(): CarouselState {
  return {
    currentImageIndex: 0,
    zoomLevel: MIN_ZOOM_LEVEL,
    zoomViewportMode: "frame",
    panX: 0,
    panY: 0,
    swipeOffsetX: 0,
  };
}

function inferMediaKind(src: string): MediaKind {
  if (/\.(mp4|webm|ogg|mov|m4v)(?:$|[?#])/i.test(src)) {
    return "video";
  }
  return "image";
}

function getElementSize(element: HTMLElement): {
  height: number;
  width: number;
} {
  const rect = element.getBoundingClientRect();
  return {
    width: element.offsetWidth || rect.width,
    height: element.offsetHeight || rect.height,
  };
}

function getIntrinsicMediaSize(
  media: HTMLImageElement | HTMLVideoElement | null,
): { height: number; width: number } | null {
  if (!media) return null;
  if (media.tagName === "IMG") {
    const image = media as HTMLImageElement;
    if (!image.naturalWidth || !image.naturalHeight) return null;
    return { width: image.naturalWidth, height: image.naturalHeight };
  }
  if (media.tagName === "VIDEO") {
    const video = media as HTMLVideoElement;
    if (!video.videoWidth || !video.videoHeight) return null;
    return { width: video.videoWidth, height: video.videoHeight };
  }
  return null;
}

function getViewportMetrics(viewportElement: HTMLElement | null | undefined): {
  centerX: number;
  centerY: number;
  height: number;
  left: number;
  top: number;
  width: number;
} {
  if (viewportElement) {
    const rect = viewportElement.getBoundingClientRect();
    return {
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
    };
  }

  return {
    centerX: window.innerWidth / 2,
    centerY: window.innerHeight / 2,
    height: window.innerHeight,
    left: 0,
    top: 0,
    width: window.innerWidth,
  };
}

/** Custom draggable/zoomable carousel for species media. */
export function SpeciesImageCarousel({
  images,
  alt,
  resetKey,
  className,
  heightClassName = "h-[500px]",
  viewportRef,
  zoomViewportMargin = DEFAULT_VIEWPORT_MARGIN,
  centerFrameOnBreakout = true,
  showZoomedFrameChain = true,
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

  const inlineStageRef = useRef<HTMLDivElement | null>(null);
  const hiddenPreloadMediaRefs = useRef<
    Record<string, HTMLImageElement | HTMLVideoElement | null>
  >({});
  const dragRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stageSize, setStageSize] = useState({ height: 0, width: 0 });
  const [state, setState] = useState<CarouselState>(createDefaultState);
  const [slideIntrinsicSizes, setSlideIntrinsicSizes] = useState<
    Record<string, IntrinsicMediaSize>
  >({});
  const slideIntrinsicSizesRef = useRef<Record<string, IntrinsicMediaSize>>({});

  const carouselKey = useMemo(
    () => resetKey ?? images.map((image) => image.id).join("-"),
    [images, resetKey],
  );

  const slides = useMemo<MediaSlide[]>(() => {
    const nextSlides: MediaSlide[] = [];
    for (const image of images) {
      const src = getSpeciesImageUrl(image);
      if (!src) continue;

      const caption = getLocalizedText(image.caption, preferredLanguage);
      const rightsOwner = image.meta?.rightsOwner
        ? `(c) ${image.meta.rightsOwner}`
        : "";
      nextSlides.push({
        id: image.id,
        src,
        caption: caption || rightsOwner,
        kind: inferMediaKind(src),
      });
    }
    return nextSlides;
  }, [images, preferredLanguage]);

  useEffect(() => {
    setState(createDefaultState());
  }, [carouselKey]);

  useEffect(() => {
    slideIntrinsicSizesRef.current = slideIntrinsicSizes;
  }, [slideIntrinsicSizes]);

  useLayoutEffect(() => {
    const stage = inlineStageRef.current;
    if (!stage) return;

    const updateStageSize = () => {
      const measured = getElementSize(stage);
      setStageSize((previous) => {
        if (
          Math.abs(previous.width - measured.width) < 0.5 &&
          Math.abs(previous.height - measured.height) < 0.5
        ) {
          return previous;
        }
        return {
          width: measured.width,
          height: measured.height,
        };
      });
    };

    updateStageSize();
    const observer = new ResizeObserver(updateStageSize);
    observer.observe(stage);
    return () => {
      observer.disconnect();
    };
  }, []);

  const currentImageIndex = useMemo(() => {
    if (slides.length === 0) return 0;
    const baseIndex = activeIndex ?? state.currentImageIndex;
    return clamp(baseIndex, 0, slides.length - 1);
  }, [activeIndex, slides.length, state.currentImageIndex]);

  const updateSlideIntrinsicSize = useCallback(
    (slideId: string, media: HTMLImageElement | HTMLVideoElement | null) => {
      const intrinsic = getIntrinsicMediaSize(media);
      if (!intrinsic || intrinsic.width <= 0 || intrinsic.height <= 0) {
        return;
      }
      setSlideIntrinsicSizes((prev) => {
        const current = prev[slideId];
        if (
          current &&
          current.width === intrinsic.width &&
          current.height === intrinsic.height
        ) {
          return prev;
        }
        return {
          ...prev,
          [slideId]: intrinsic,
        };
      });
    },
    [],
  );

  const captureIntrinsicSizeOnMount = useCallback(
    (slideId: string, media: HTMLImageElement | HTMLVideoElement | null) => {
      if (!media) return;
      updateSlideIntrinsicSize(slideId, media);
    },
    [updateSlideIntrinsicSize],
  );

  const registerHiddenPreloadMedia = useCallback(
    (slideId: string, media: HTMLImageElement | HTMLVideoElement | null) => {
      hiddenPreloadMediaRefs.current[slideId] = media;
      captureIntrinsicSizeOnMount(slideId, media);
    },
    [captureIntrinsicSizeOnMount],
  );

  useEffect(() => {
    if (slides.length === 0) return;

    const cleanups: Array<() => void> = [];
    let animationFrame = 0;

    const syncMissingIntrinsicSizes = () => {
      for (const slide of slides) {
        if (slideIntrinsicSizesRef.current[slide.id]) continue;
        updateSlideIntrinsicSize(
          slide.id,
          hiddenPreloadMediaRefs.current[slide.id] ?? null,
        );
      }
    };

    // Hidden preload media can already be complete by the time hydration finishes.
    // Sync once after commit so the visible frames never stay at 0x0 waiting for
    // missed ref/onLoad timing in the app page.
    animationFrame = window.requestAnimationFrame(syncMissingIntrinsicSizes);

    for (const slide of slides) {
      const media = hiddenPreloadMediaRefs.current[slide.id];
      if (!media) continue;

      const eventName = slide.kind === "video" ? "loadedmetadata" : "load";
      const handleReady = () => {
        updateSlideIntrinsicSize(slide.id, media);
      };

      media.addEventListener(eventName, handleReady);
      cleanups.push(() => {
        media.removeEventListener(eventName, handleReady);
      });
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [carouselKey, slides, updateSlideIntrinsicSize]);

  const hasMeasuredStage = stageSize.width > 0 && stageSize.height > 0;
  const stageLayoutSize = useMemo(
    () => ({
      height: Math.max(80, hasMeasuredStage ? stageSize.height : 315),
      width: Math.max(80, hasMeasuredStage ? stageSize.width : 420),
    }),
    [hasMeasuredStage, stageSize.height, stageSize.width],
  );

  const slideBaseSizes = useMemo(() => {
    const maxWidth = Math.max(80, stageLayoutSize.width - 16);
    const maxHeight = Math.max(80, stageLayoutSize.height - 16);

    return slides.map((slide) => {
      const intrinsic = slideIntrinsicSizes[slide.id];
      if (
        !hasMeasuredStage ||
        !intrinsic ||
        intrinsic.width <= 0 ||
        intrinsic.height <= 0
      ) {
        return null;
      }
      const aspectRatio = intrinsic.width / intrinsic.height;

      let width = maxWidth;
      let height = width / aspectRatio;
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      return {
        height,
        width,
      };
    });
  }, [
    hasMeasuredStage,
    slideIntrinsicSizes,
    slides,
    stageLayoutSize.height,
    stageLayoutSize.width,
  ]);

  const activeSlide = slides[currentImageIndex];
  const activeFrameBaseSize = slideBaseSizes[currentImageIndex];
  const activeIntrinsicSize = activeSlide
    ? slideIntrinsicSizes[activeSlide.id]
    : null;
  const isGeometryReady = Boolean(
    hasMeasuredStage &&
    activeSlide &&
    activeFrameBaseSize &&
    activeIntrinsicSize,
  );
  const resolveViewportMetrics = useCallback(
    (viewportMode: "frame" | "window" = state.zoomViewportMode) =>
      getViewportMetrics(
        viewportMode === "window" ? null : viewportRef?.current,
      ),
    [state.zoomViewportMode, viewportRef],
  );

  const oneToOneZoomScale = useMemo(() => {
    if (
      !activeFrameBaseSize ||
      !activeIntrinsicSize ||
      activeFrameBaseSize.width <= 0 ||
      activeFrameBaseSize.height <= 0
    ) {
      return 1;
    }

    return Math.max(
      0.01,
      Math.min(
        activeIntrinsicSize.width / activeFrameBaseSize.width,
        activeIntrinsicSize.height / activeFrameBaseSize.height,
      ),
    );
  }, [activeFrameBaseSize, activeIntrinsicSize]);
  const breakoutZoomScale =
    oneToOneZoomScale <= ONE_TO_ONE_CLOSE_THRESHOLD
      ? FALLBACK_BREAKOUT_SCALE
      : oneToOneZoomScale;
  const safeZoomLevel = clamp(state.zoomLevel, MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL);
  const totalScale = safeZoomLevel > MIN_ZOOM_LEVEL ? breakoutZoomScale : 1;
  const isZoomedIn = safeZoomLevel > MIN_ZOOM_LEVEL;
  const canNavigateSlides = !isZoomedIn;
  const navigationTargetZoomLevel = MIN_ZOOM_LEVEL;

  useEffect(() => {
    onModalOpenChange?.(isZoomedIn);
  }, [isZoomedIn, onModalOpenChange]);

  const getSideFrameScale = useCallback((distance: number) => {
    if (distance <= 0) return 1;
    if (distance === 1) return SIDE_FRAME_SCALE_NEAR;
    if (distance === 2) return SIDE_FRAME_SCALE_MID;
    return SIDE_FRAME_SCALE_FAR;
  }, []);

  const slideTargets = useMemo<SlideSpringTarget[]>(() => {
    if (slides.length === 0) return [];
    if (!isGeometryReady) {
      return slides.map(() => ({
        frameHeight: 0,
        frameOpacity: 0,
        frameScale: 1,
        frameWidth: 0,
        panX: 0,
        panY: 0,
      }));
    }

    const focusIndex = clamp(currentImageIndex, 0, slides.length - 1);
    const baseTargets = slides.map((_, index) => {
      const distance = Math.abs(index - focusIndex);
      const frameBaseSize = slideBaseSizes[index];
      if (!frameBaseSize) {
        return {
          frameHeight: 0,
          frameOpacity: 0,
          frameScale: 1,
          frameWidth: 0,
          panX: 0,
          panY: 0,
        };
      }

      return {
        frameHeight: frameBaseSize.height,
        frameOpacity: 1,
        frameScale: distance === 0 ? 1 : getSideFrameScale(distance),
        frameWidth: frameBaseSize.width,
        panX: 0,
        panY: 0,
      };
    });

    const scaledGap = STRIP_BASE_GAP;

    let previousVisibleIndex = focusIndex;
    for (let index = focusIndex + 1; index < baseTargets.length; index += 1) {
      const current = baseTargets[index];
      if (current.frameOpacity === 0) continue;
      const previous = baseTargets[previousVisibleIndex];
      const previousHalfWidth = (previous.frameWidth * previous.frameScale) / 2;
      const currentHalfWidth = (current.frameWidth * current.frameScale) / 2;
      current.panX =
        previous.panX + previousHalfWidth + currentHalfWidth + scaledGap;
      current.panY = 0;
      previousVisibleIndex = index;
    }

    let nextVisibleIndex = focusIndex;
    for (let index = focusIndex - 1; index >= 0; index -= 1) {
      const current = baseTargets[index];
      if (current.frameOpacity === 0) continue;
      const next = baseTargets[nextVisibleIndex];
      const nextHalfWidth = (next.frameWidth * next.frameScale) / 2;
      const currentHalfWidth = (current.frameWidth * current.frameScale) / 2;
      current.panX = next.panX - (nextHalfWidth + currentHalfWidth + scaledGap);
      current.panY = 0;
      nextVisibleIndex = index;
    }

    let virtualFocusIndex = focusIndex;
    if (!isZoomedIn && Math.abs(state.swipeOffsetX) > 0.01) {
      if (state.swipeOffsetX < 0 && focusIndex < baseTargets.length - 1) {
        const nextTarget = baseTargets[focusIndex + 1];
        const distanceToNext = Math.abs(
          nextTarget.panX - baseTargets[focusIndex].panX,
        );
        if (distanceToNext > 0.01) {
          const progress = clamp(-state.swipeOffsetX / distanceToNext, 0, 1);
          virtualFocusIndex = focusIndex + progress;
        }
      } else if (state.swipeOffsetX > 0 && focusIndex > 0) {
        const previousTarget = baseTargets[focusIndex - 1];
        const distanceToPrevious = Math.abs(
          baseTargets[focusIndex].panX - previousTarget.panX,
        );
        if (distanceToPrevious > 0.01) {
          const progress = clamp(state.swipeOffsetX / distanceToPrevious, 0, 1);
          virtualFocusIndex = focusIndex - progress;
        }
      }
    }

    if (!isZoomedIn) {
      baseTargets.forEach((target, index) => {
        if (target.frameOpacity === 0) return;
        target.frameScale = interpolateFrameScale(
          Math.abs(index - virtualFocusIndex),
        );
      });
    }

    if (!isZoomedIn && Math.abs(state.swipeOffsetX) > 0.01) {
      for (const target of baseTargets) {
        target.panX += state.swipeOffsetX;
      }
    }

    const activeTarget = baseTargets[focusIndex];
    if (activeTarget) {
      if (isZoomedIn) {
        activeTarget.frameScale = totalScale;
        activeTarget.panX = state.panX;
        activeTarget.panY = state.panY;
      }
    }

    return baseTargets;
  }, [
    currentImageIndex,
    getSideFrameScale,
    isGeometryReady,
    isZoomedIn,
    slideBaseSizes,
    slides,
    state.panX,
    state.panY,
    state.swipeOffsetX,
    totalScale,
  ]);

  const slideSpringProps = useMemo(
    () =>
      slides.map((_, index) => {
        const target = slideTargets[index] ?? {
          frameHeight: 315,
          frameOpacity: 1,
          frameScale: 1,
          frameWidth: 420,
          panX: 0,
          panY: 0,
        };
        const isActive = index === currentImageIndex;

        return {
          config:
            isDragging && isActive
              ? {
                  duration: 0,
                }
              : {
                  friction: 30,
                  mass: 1,
                  tension: 300,
                },
          frameHeight: target.frameHeight,
          frameOpacity: target.frameOpacity,
          frameScale: target.frameScale,
          frameWidth: target.frameWidth,
          immediate: isDragging && isActive,
          panX: target.panX,
          panY: target.panY,
        };
      }),
    [currentImageIndex, isDragging, slideTargets, slides],
  );

  const slideSprings = useSprings(slides.length, slideSpringProps);

  const clampPanToBounds = useCallback(
    (
      panX: number,
      panY: number,
      scale = totalScale,
      zoomLevel = safeZoomLevel,
      viewportMode: "frame" | "window" = state.zoomViewportMode,
    ) => {
      const stage = inlineStageRef.current;
      if (!stage || !activeFrameBaseSize) return { panX: 0, panY: 0 };

      const scaledWidth = activeFrameBaseSize.width * scale;
      const scaledHeight = activeFrameBaseSize.height * scale;
      const isDetached = zoomLevel > MIN_ZOOM_LEVEL && centerFrameOnBreakout;

      if (isDetached) {
        const stageRect = stage.getBoundingClientRect();
        const viewportMetrics = resolveViewportMetrics(viewportMode);
        const centerPanX =
          viewportMetrics.centerX - (stageRect.left + stageRect.width / 2);
        const centerPanY =
          viewportMetrics.centerY - (stageRect.top + stageRect.height / 2);

        const availableViewportWidth = Math.max(
          1,
          viewportMetrics.width - zoomViewportMargin * 2,
        );
        const availableViewportHeight = Math.max(
          1,
          viewportMetrics.height - zoomViewportMargin * 2,
        );
        const panRangeX = Math.abs(scaledWidth - availableViewportWidth) / 2;
        const panRangeY = Math.abs(scaledHeight - availableViewportHeight) / 2;

        return {
          panX: clamp(panX, centerPanX - panRangeX, centerPanX + panRangeX),
          panY: clamp(panY, centerPanY - panRangeY, centerPanY + panRangeY),
        };
      }

      const stageRect = stage.getBoundingClientRect();
      const maxX = Math.max(0, (scaledWidth - stageRect.width) / 2);
      const maxY = Math.max(0, (scaledHeight - stageRect.height) / 2);

      return {
        panX: clamp(panX, -maxX, maxX),
        panY: clamp(panY, -maxY, maxY),
      };
    },
    [
      activeFrameBaseSize,
      centerFrameOnBreakout,
      resolveViewportMetrics,
      safeZoomLevel,
      state.zoomViewportMode,
      totalScale,
      zoomViewportMargin,
    ],
  );

  const resolveViewportFitCenter = useCallback(
    (
      scale: number,
      viewportMode: "frame" | "window" = state.zoomViewportMode,
    ) => {
      const stage = inlineStageRef.current;
      if (!stage || !activeFrameBaseSize) return null;

      const viewportMetrics = resolveViewportMetrics(viewportMode);
      const viewportCenterX = viewportMetrics.centerX;
      const viewportCenterY = viewportMetrics.centerY;
      const stageRect = stage.getBoundingClientRect();
      const stageCenterX = stageRect.left + stageRect.width / 2;
      const stageCenterY = stageRect.top + stageRect.height / 2;
      const canContainInViewport =
        activeFrameBaseSize.width * scale <=
          viewportMetrics.width - zoomViewportMargin * 2 &&
        activeFrameBaseSize.height * scale <=
          viewportMetrics.height - zoomViewportMargin * 2;

      return {
        canContainInViewport,
        centerPanX: viewportCenterX - stageCenterX,
        centerPanY: viewportCenterY - stageCenterY,
        stageCenterX,
        stageCenterY,
        viewportCenterX,
        viewportCenterY,
      };
    },
    [
      activeFrameBaseSize,
      resolveViewportMetrics,
      state.zoomViewportMode,
      zoomViewportMargin,
    ],
  );

  const resolveScaleForZoomLevel = useCallback(
    (zoomLevel: number) => (zoomLevel > MIN_ZOOM_LEVEL ? breakoutZoomScale : 1),
    [breakoutZoomScale],
  );

  const resolvePanForZoomLevel = useCallback(
    (
      zoomLevel: number,
      panX: number,
      panY: number,
      viewportMode: "frame" | "window" = state.zoomViewportMode,
    ) => {
      const level = clamp(zoomLevel, MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL);
      const scale = resolveScaleForZoomLevel(level);
      const viewportFit = resolveViewportFitCenter(scale, viewportMode);
      if (
        centerFrameOnBreakout &&
        level === DETACHED_ZOOM_LEVEL &&
        viewportFit
      ) {
        return {
          panX: viewportFit.centerPanX,
          panY: viewportFit.centerPanY,
        };
      }
      return clampPanToBounds(panX, panY, scale, level, viewportMode);
    },
    [
      centerFrameOnBreakout,
      clampPanToBounds,
      resolveScaleForZoomLevel,
      resolveViewportFitCenter,
      state.zoomViewportMode,
    ],
  );

  const navigateToIndex = useCallback(
    (
      nextIndex: number,
      options?: {
        animateDirection?: -1 | 1;
        targetZoomLevel?: number;
      },
    ) => {
      if (slides.length === 0) return;
      const clamped = clamp(nextIndex, 0, slides.length - 1);
      if (clamped !== currentImageIndex) {
        onIndexChange?.(clamped);
      }
      const targetZoomLevel = clamp(
        options?.targetZoomLevel ?? MIN_ZOOM_LEVEL,
        MIN_ZOOM_LEVEL,
        MAX_ZOOM_LEVEL,
      );

      setState((prev) => {
        if (targetZoomLevel === MIN_ZOOM_LEVEL) {
          return {
            ...prev,
            currentImageIndex: clamped,
            zoomLevel: MIN_ZOOM_LEVEL,
            zoomViewportMode: "frame",
            panX: 0,
            panY: 0,
            swipeOffsetX: 0,
          };
        }
        const nextPan = resolvePanForZoomLevel(targetZoomLevel, 0, 0, "frame");
        return {
          ...prev,
          currentImageIndex: clamped,
          zoomLevel: targetZoomLevel,
          zoomViewportMode: "frame",
          panX: nextPan.panX,
          panY: nextPan.panY,
          swipeOffsetX: 0,
        };
      });
    },
    [currentImageIndex, onIndexChange, resolvePanForZoomLevel, slides.length],
  );

  const setCurrentImageIndex = useCallback(
    (nextIndex: number) => {
      if (!canNavigateSlides) return;
      navigateToIndex(nextIndex, {
        targetZoomLevel: navigationTargetZoomLevel,
      });
    },
    [canNavigateSlides, navigateToIndex, navigationTargetZoomLevel],
  );

  const stepImage = useCallback(
    (direction: -1 | 1) => {
      if (!canNavigateSlides) return;
      if (slides.length === 0) return;
      const nextIndex = clamp(
        currentImageIndex + direction,
        0,
        slides.length - 1,
      );
      if (nextIndex === currentImageIndex) return;
      navigateToIndex(nextIndex, {
        animateDirection: direction,
        targetZoomLevel: navigationTargetZoomLevel,
      });
    },
    [
      canNavigateSlides,
      currentImageIndex,
      navigateToIndex,
      navigationTargetZoomLevel,
      slides.length,
    ],
  );

  const toggleZoom = useCallback(
    (focusPoint?: ZoomFocusPoint, options?: ToggleZoomOptions) => {
      setState((prev) => {
        if (!enableModal) return prev;
        const currentLevel = clamp(
          prev.zoomLevel,
          MIN_ZOOM_LEVEL,
          MAX_ZOOM_LEVEL,
        );
        const nextLevel =
          currentLevel > MIN_ZOOM_LEVEL ? MIN_ZOOM_LEVEL : DETACHED_ZOOM_LEVEL;
        if (nextLevel === MIN_ZOOM_LEVEL) {
          return {
            ...prev,
            zoomLevel: MIN_ZOOM_LEVEL,
            zoomViewportMode: "frame",
            panX: 0,
            panY: 0,
            swipeOffsetX: 0,
          };
        }

        const requestedScale = resolveScaleForZoomLevel(nextLevel);
        const currentScale = resolveScaleForZoomLevel(currentLevel);
        const nextViewportMode = options?.viewportMode ?? "frame";
        let nextPanX = prev.panX;
        let nextPanY = prev.panY;
        let shouldClampPan = true;
        const shouldCenterOnBreakout =
          options?.centerOnBreakout && nextLevel === DETACHED_ZOOM_LEVEL;
        const viewportFit = resolveViewportFitCenter(
          requestedScale,
          nextViewportMode,
        );
        if (viewportFit) {
          if (shouldCenterOnBreakout) {
            nextPanX = viewportFit.centerPanX;
            nextPanY = viewportFit.centerPanY;
            shouldClampPan = false;
          } else if (focusPoint) {
            const localX =
              (focusPoint.clientX - viewportFit.stageCenterX - prev.panX) /
              currentScale;
            const localY =
              (focusPoint.clientY - viewportFit.stageCenterY - prev.panY) /
              currentScale;

            nextPanX =
              focusPoint.clientX -
              viewportFit.stageCenterX -
              localX * requestedScale;
            nextPanY =
              focusPoint.clientY -
              viewportFit.stageCenterY -
              localY * requestedScale;
          } else if (
            centerFrameOnBreakout &&
            nextLevel === DETACHED_ZOOM_LEVEL
          ) {
            nextPanX = viewportFit.centerPanX;
            nextPanY = viewportFit.centerPanY;
            shouldClampPan = false;
          }
        }

        const clampedPan = shouldClampPan
          ? clampPanToBounds(
              nextPanX,
              nextPanY,
              requestedScale,
              nextLevel,
              nextViewportMode,
            )
          : { panX: nextPanX, panY: nextPanY };
        return {
          ...prev,
          zoomLevel: nextLevel,
          zoomViewportMode: nextViewportMode,
          panX: clampedPan.panX,
          panY: clampedPan.panY,
          swipeOffsetX: 0,
        };
      });
    },
    [
      centerFrameOnBreakout,
      clampPanToBounds,
      enableModal,
      resolveScaleForZoomLevel,
      resolveViewportFitCenter,
    ],
  );

  useEffect(() => {
    if (safeZoomLevel <= MIN_ZOOM_LEVEL) return;
    setState((prev) => {
      if (prev.zoomLevel <= MIN_ZOOM_LEVEL) return prev;
      const clampedPan = clampPanToBounds(
        prev.panX,
        prev.panY,
        totalScale,
        prev.zoomLevel,
        prev.zoomViewportMode,
      );
      if (
        Math.abs(prev.panX - clampedPan.panX) < 0.5 &&
        Math.abs(prev.panY - clampedPan.panY) < 0.5
      ) {
        return prev;
      }
      return {
        ...prev,
        panX: clampedPan.panX,
        panY: clampedPan.panY,
      };
    });
  }, [clampPanToBounds, safeZoomLevel, totalScale]);

  const handleStageDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isGeometryReady) return;
      if (!(event.target instanceof HTMLElement)) return;
      if (event.target.closest("[data-gallery-control='true']")) return;
      if (event.target.tagName === "VIDEO") return;
      event.preventDefault();

      const clickPoint = {
        clientX: event.clientX,
        clientY: event.clientY,
      };
      onImageClick?.(currentImageIndex);
      if (!enableModal) return;
      toggleZoom(clickPoint);
    },
    [currentImageIndex, enableModal, isGeometryReady, onImageClick, toggleZoom],
  );

  const handleSlideClick = useCallback(
    (index: number, event: React.MouseEvent<HTMLElement>) => {
      if (!canNavigateSlides) return;
      if (index === currentImageIndex) {
        return;
      }
      event.stopPropagation();
      const direction: -1 | 1 = index > currentImageIndex ? 1 : -1;
      navigateToIndex(index, {
        animateDirection: direction,
        targetZoomLevel: navigationTargetZoomLevel,
      });
    },
    [
      canNavigateSlides,
      currentImageIndex,
      navigateToIndex,
      navigationTargetZoomLevel,
    ],
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
      if (isEditableTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const lowerKey = event.key.toLowerCase();
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        stepImage(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        stepImage(1);
        return;
      }
      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        toggleZoom(undefined, {
          centerOnBreakout: true,
          viewportMode: "window",
        });
        return;
      }
      if (event.key === "Escape" && safeZoomLevel > MIN_ZOOM_LEVEL) {
        event.preventDefault();
        setState((prev) => ({
          ...prev,
          zoomLevel: MIN_ZOOM_LEVEL,
          zoomViewportMode: "frame",
          panX: 0,
          panY: 0,
          swipeOffsetX: 0,
        }));
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [safeZoomLevel, stepImage, toggleZoom]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isGeometryReady) return;
      if (event.button !== 0) return;
      if (!(event.target instanceof HTMLElement)) return;
      if (event.target.closest("[data-gallery-control='true']")) return;
      if (event.target.tagName === "VIDEO") return;

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic pointer events used in tests may not register as active pointers.
      }
      dragRef.current = {
        mode: isZoomedIn ? "pan" : "swipe",
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startPanX: state.panX,
        startPanY: state.panY,
        startSwipeOffsetX: state.swipeOffsetX,
        moved: false,
      };
    },
    [isGeometryReady, isZoomedIn, state.panX, state.panY, state.swipeOffsetX],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      if (
        !drag.moved &&
        (Math.abs(deltaX) > SWIPE_MOVE_THRESHOLD ||
          Math.abs(deltaY) > SWIPE_MOVE_THRESHOLD)
      ) {
        drag.moved = true;
        setIsDragging(true);
      }
      if (!drag.moved) {
        return;
      }

      if (drag.mode === "swipe") {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          event.preventDefault();
          const isAtLeftEdge = currentImageIndex === 0 && deltaX > 0;
          const isAtRightEdge =
            currentImageIndex === slides.length - 1 && deltaX < 0;
          const swipePanX =
            isAtLeftEdge || isAtRightEdge
              ? drag.startSwipeOffsetX + deltaX * 0.35
              : drag.startSwipeOffsetX + deltaX;
          setState((prev) => ({
            ...prev,
            swipeOffsetX: swipePanX,
          }));
        }
        return;
      }

      event.preventDefault();

      setState((prev) => ({
        ...prev,
        panX: drag.startPanX + deltaX,
        panY: drag.startPanY + deltaY,
      }));
    },
    [currentImageIndex, slides.length],
  );

  const releaseDrag = useCallback(
    (
      pointerEvent?: Pick<
        React.PointerEvent<HTMLDivElement>,
        "clientX" | "clientY"
      >,
    ) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      setIsDragging(false);

      if (drag.mode === "swipe") {
        if (pointerEvent && canNavigateSlides) {
          const deltaX = pointerEvent.clientX - drag.startX;
          const deltaY = pointerEvent.clientY - drag.startY;
          const isHorizontalSwipe =
            Math.abs(deltaX) >= SWIPE_TRIGGER_DISTANCE &&
            Math.abs(deltaX) > Math.abs(deltaY);
          if (isHorizontalSwipe) {
            const direction: -1 | 1 = deltaX < 0 ? 1 : -1;
            const nextIndex = clamp(
              currentImageIndex + direction,
              0,
              slides.length - 1,
            );
            if (nextIndex !== currentImageIndex) {
              stepImage(direction);
              return;
            }
          }
        }
        setState((prev) => ({
          ...prev,
          swipeOffsetX: 0,
        }));
        return;
      }

      setState((prev) => {
        const scale = resolveScaleForZoomLevel(prev.zoomLevel);
        const nextPan = clampPanToBounds(
          prev.panX,
          prev.panY,
          scale,
          prev.zoomLevel,
          prev.zoomViewportMode,
        );
        if (nextPan.panX === prev.panX && nextPan.panY === prev.panY) {
          return prev;
        }
        return {
          ...prev,
          panX: nextPan.panX,
          panY: nextPan.panY,
        };
      });
    },
    [
      canNavigateSlides,
      clampPanToBounds,
      currentImageIndex,
      resolveScaleForZoomLevel,
      slides.length,
      stepImage,
    ],
  );

  if (slides.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-transparent text-muted-foreground",
          heightClassName,
          className,
        )}
      >
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Keep API-compatible props in use so behavior customizations can still pass through without runtime warnings.
  void embeddedLightboxProps;
  void fullScreenLightboxProps;
  void showZoomedFrameChain;

  const stageCursorClass = isDragging ? "cursor-grabbing" : "cursor-default";

  const getSlideZIndex = (index: number) => {
    const distance = Math.abs(index - currentImageIndex);
    if (distance === 0 && safeZoomLevel >= DETACHED_ZOOM_LEVEL) return 50;
    if (distance === 0) return 30;
    if (distance === 1) return 20;
    if (distance === 2) return 15;
    return 10;
  };

  const isPreviousDisabled = currentImageIndex === 0;
  const isNextDisabled = currentImageIndex >= slides.length - 1;

  return (
    <div
      ref={inlineStageRef}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-visible bg-transparent",
        heightClassName,
        className,
        stageCursorClass,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => {
        releaseDrag(event);
      }}
      onPointerCancel={() => {
        releaseDrag();
      }}
      onDoubleClick={handleStageDoubleClick}
    >
      <div className="absolute inset-0 bg-transparent" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
      >
        {slides.map((slide) =>
          slide.kind === "video" ? (
            <video
              key={`${slide.id}-preload`}
              preload="metadata"
              ref={(node) => {
                registerHiddenPreloadMedia(slide.id, node);
              }}
              onLoadedMetadata={(event) => {
                updateSlideIntrinsicSize(slide.id, event.currentTarget);
              }}
              src={slide.src}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${slide.id}-preload`}
              alt=""
              decoding="async"
              loading="eager"
              ref={(node) => {
                registerHiddenPreloadMedia(slide.id, node);
              }}
              onLoad={(event) => {
                updateSlideIntrinsicSize(slide.id, event.currentTarget);
              }}
              src={slide.src}
            />
          ),
        )}
      </div>

      {isGeometryReady ? (
        slides.map((slide, index) => {
          if (!slideBaseSizes[index]) return null;
          const slideSpring = slideSprings[index];

          return (
            <div
              key={slide.id}
              className="pointer-events-none absolute left-1/2 top-1/2"
              style={{
                transform: "translate3d(-50%, -50%, 0)",
                zIndex: getSlideZIndex(index),
              }}
            >
              <animated.figure
                style={{
                  height: slideSpring.frameHeight,
                  opacity: slideSpring.frameOpacity,
                  transform: to(
                    [
                      slideSpring.panX,
                      slideSpring.panY,
                      slideSpring.frameScale,
                    ],
                    (panX, panY, frameScale) =>
                      `translate3d(${panX}px, ${panY}px, 0) scale(${frameScale})`,
                  ),
                  userSelect: "none",
                  width: slideSpring.frameWidth,
                }}
                className="pointer-events-auto relative transform-gpu rounded-lg bg-[rgba(255,255,255,0.96)] shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_0_0_6px_rgba(255,255,255,0.96)]"
                onClick={(event) => {
                  handleSlideClick(index, event);
                }}
              >
                <div className="relative h-full w-full overflow-hidden rounded-lg bg-black/5">
                  {slide.kind === "video" ? (
                    <video
                      className="h-full w-full object-contain"
                      controls
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={(event) => {
                        updateSlideIntrinsicSize(slide.id, event.currentTarget);
                      }}
                      src={slide.src}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={alt}
                      className="h-full w-full object-contain"
                      draggable={false}
                      onLoad={(event) => {
                        updateSlideIntrinsicSize(slide.id, event.currentTarget);
                      }}
                      src={slide.src}
                    />
                  )}
                  {slide.caption ? (
                    <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-black/0 px-3 py-3 text-xs text-white/92 sm:text-sm">
                      {slide.caption}
                    </figcaption>
                  ) : null}
                </div>
              </animated.figure>
            </div>
          );
        })
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner className="h-full w-full" />
        </div>
      )}

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            aria-label={alt}
            data-gallery-control="true"
            onClick={() => stepImage(-1)}
            className="z-30 absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-black/10 bg-white/78 p-2 text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-sm hover:bg-white disabled:opacity-50 sm:left-4"
            disabled={
              !isGeometryReady || !canNavigateSlides || isPreviousDisabled
            }
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            type="button"
            aria-label={alt}
            data-gallery-control="true"
            onClick={() => stepImage(1)}
            className="z-30 absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-black/10 bg-white/78 p-2 text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-sm hover:bg-white disabled:opacity-50 sm:right-4"
            disabled={!isGeometryReady || !canNavigateSlides || isNextDisabled}
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </>
      ) : null}

      {showPagination && slides.length > 1 ? (
        <div className="z-30 absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-2 py-1.5 backdrop-blur-sm sm:bottom-4">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              data-gallery-control="true"
              onClick={() => setCurrentImageIndex(index)}
              className={cn(
                "h-2.5 w-2.5 rounded-full border",
                index === currentImageIndex
                  ? "scale-110 border-[var(--vs-color-primary)] bg-[var(--vs-color-primary)]"
                  : "border-black/20 bg-white",
              )}
              disabled={!isGeometryReady || !canNavigateSlides}
              aria-label={`${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
