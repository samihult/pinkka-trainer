"use client";

/**
 * Minimal Fabric.js canvas component that can initialize from a JSON model and
 * optional background image.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from "react";
import { Canvas, FabricImage, InteractiveFabricObject } from "fabric";

import { cn } from "@/lib/utils";

const DARK_VIEWPORT_COLOR = "#2f2f2f";
const BORDER_COLOR = "#253ed3";

/** Ref API for `FabricJsonCanvas`. */
export interface FabricJsonCanvasHandle {}

/** Props for the minimal Fabric.js JSON canvas wrapper. */
export interface FabricJsonCanvasProps {
  /** Initial Fabric JSON model loaded with `Canvas.loadFromJSON()`. */
  initialModel?: unknown;
  /** Optional background image URL shown behind canvas objects. */
  backgroundImageUrl?: string;
  /** Viewport width in pixels. */
  viewportWidth?: number;
  /** Viewport height in pixels. */
  viewportHeight?: number;
  /** Optional wrapper class name. */
  className?: string;
}

function fitBackgroundImageToViewport(canvas: Canvas, image: FabricImage) {
  const imageWidth = image.width ?? image.getScaledWidth();
  const imageHeight = image.height ?? image.getScaledHeight();
  if (imageWidth <= 0 || imageHeight <= 0) {
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    return;
  }

  const viewportWidth = canvas.getWidth();
  const viewportHeight = canvas.getHeight();
  const zoom = Math.min(
    viewportWidth / imageWidth,
    viewportHeight / imageHeight,
  );
  const translateX = (viewportWidth - imageWidth * zoom) / 2;
  const translateY = (viewportHeight - imageHeight * zoom) / 2;

  canvas.setViewportTransform([zoom, 0, 0, zoom, translateX, translateY]);
}

/**
 * Uncontrolled Fabric.js canvas initialized from JSON and exposing a ref API
 * shell for future methods/getters.
 */
export const FabricJsonCanvas = forwardRef<
  FabricJsonCanvasHandle,
  FabricJsonCanvasProps
>(function FabricJsonCanvas(
  {
    initialModel,
    backgroundImageUrl,
    viewportWidth = 960,
    viewportHeight = 540,
    className,
  },
  ref,
) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  // const serializedModelRef = useRef<unknown>(null);

  useImperativeHandle(ref, () => ({}), []);

  useEffect(() => {
    const element = canvasElementRef.current;
    if (!element) {
      return;
    }

    const canvas = new Canvas(element, {
      width: viewportWidth,
      height: viewportHeight,
      backgroundColor: DARK_VIEWPORT_COLOR,
      preserveObjectStacking: true,
    });

    InteractiveFabricObject.ownDefaults = {
      ...InteractiveFabricObject.ownDefaults,
      cornerSize: 8,
      cornerStrokeColor: BORDER_COLOR,
      cornerColor: "white",
      cornerStyle: "rect",
      padding: 0,
      transparentCorners: false,
      borderColor: BORDER_COLOR,
      borderScaleFactor: 1,
      borderOpacityWhenMoving: 0.8,
    };

    fabricCanvasRef.current = canvas;

    return () => {
      void canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [viewportHeight, viewportWidth]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      return;
    }

    let cancelled = false;

    const initializeCanvas = async () => {
      canvas.setDimensions({ width: viewportWidth, height: viewportHeight });
      canvas.clear();
      canvas.backgroundColor = DARK_VIEWPORT_COLOR;
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

      if (initialModel !== undefined) {
        await canvas.loadFromJSON(
          initialModel as Parameters<Canvas["loadFromJSON"]>[0],
        );
      }

      if (backgroundImageUrl) {
        const backgroundImage = await FabricImage.fromURL(backgroundImageUrl, {
          crossOrigin: "anonymous",
        });
        if (cancelled) {
          return;
        }

        backgroundImage.set({
          left: 0,
          top: 0,
          originX: "left",
          originY: "top",
          selectable: false,
          evented: false,
        });

        canvas.backgroundImage = backgroundImage;
        fitBackgroundImageToViewport(canvas, backgroundImage);
      } else {
        canvas.backgroundImage = undefined;
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      }

      canvas.requestRenderAll();
    };

    void initializeCanvas();

    return () => {
      cancelled = true;
    };
  }, [backgroundImageUrl, initialModel, viewportHeight, viewportWidth]);

  const style: CSSProperties = {
    width: viewportWidth,
    height: viewportHeight,
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border bg-[#2f2f2f]",
        className,
      )}
      style={style}
    >
      <canvas ref={canvasElementRef} className="block h-full w-full" />
    </div>
  );
});
