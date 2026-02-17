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
import {
  Canvas,
  Circle,
  Ellipse,
  FabricImage,
  FabricObject,
  InteractiveFabricObject,
  Point,
} from "fabric";
import { LeaderTextWithArrow } from "@/components/fabric-leader-text-with-arrow";

import { cn } from "@/lib/utils";

const DARK_VIEWPORT_COLOR = "#2f2f2f";
const BORDER_COLOR = "#253ed3";
const GEOMETRY_EPSILON = 0.0001;

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

type TransformableFabricObject = FabricObject & {
  transformMatrix?: number[];
};

function applyObjectBehaviorRules(object: FabricObject) {
  object.set({
    strokeUniform: true,
    noScaleCache: false,
  });

  if (object instanceof Circle) {
    object.setControlVisible("mtr", false);
    object.set({
      centeredScaling: true,
    });
  }
}

function bakeGeometryIntoObject(object: FabricObject) {
  const scaleX = object.scaleX ?? 1;
  const scaleY = object.scaleY ?? 1;
  const usesScaleTransform =
    Math.abs(scaleX - 1) > GEOMETRY_EPSILON ||
    Math.abs(scaleY - 1) > GEOMETRY_EPSILON;
  const usesMatrixTransform = Boolean(
    (object as TransformableFabricObject).transformMatrix,
  );

  if (!usesScaleTransform && !usesMatrixTransform) {
    return;
  }

  const center = object.getCenterPoint();
  const nextScaleX = Math.abs(scaleX);
  const nextScaleY = Math.abs(scaleY);

  if (object instanceof LeaderTextWithArrow) {
    object.scaleInternalGeometry(nextScaleX, nextScaleY);
  } else if (object instanceof Ellipse) {
    object.set({
      rx: Math.max(0.5, object.rx * nextScaleX),
      ry: Math.max(0.5, object.ry * nextScaleY),
    });
  } else if (object instanceof Circle) {
    // Circle supports one radius, so we preserve circle geometry with average scale.
    const uniformScale = (nextScaleX + nextScaleY) / 2;
    object.set({
      radius: Math.max(0.5, object.radius * uniformScale),
    });
  } else if (
    "fontSize" in object &&
    typeof object.fontSize === "number" &&
    Number.isFinite(object.fontSize)
  ) {
    const fontScale = (nextScaleX + nextScaleY) / 2;
    object.set({
      fontSize: Math.max(1, object.fontSize * fontScale),
    });
  }

  if (
    typeof object.width === "number" &&
    Number.isFinite(object.width) &&
    !(object instanceof Ellipse) &&
    !(object instanceof Circle)
  ) {
    object.set({
      width: Math.max(1, object.width * nextScaleX),
    });
  }

  if (
    typeof object.height === "number" &&
    Number.isFinite(object.height) &&
    !(object instanceof Ellipse) &&
    !(object instanceof Circle)
  ) {
    object.set({
      height: Math.max(1, object.height * nextScaleY),
    });
  }

  if (scaleX < 0) {
    object.set({
      flipX: !object.flipX,
    });
  }

  if (scaleY < 0) {
    object.set({
      flipY: !object.flipY,
    });
  }

  object.set({
    scaleX: 1,
    scaleY: 1,
  });
  (object as TransformableFabricObject).transformMatrix = undefined;
  object.setPositionByOrigin(center, "center", "center");
  object.setCoords();
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
      uniformScaling: false,
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
    let placingLeaderTarget: LeaderTextWithArrow | null = null;
    const defaultMarqueeSelectionEnabled = canvas.selection;
    let isPlacementPointerDown = false;
    let didDragDuringPlacementPointerDown = false;
    let placementPointerDownStart: Point | null = null;

    const setLeaderPlacementMode = (isPlacing: boolean) => {
      canvas.selection = isPlacing ? false : defaultMarqueeSelectionEnabled;
    };

    const refreshLeaderSelectionVisuals = () => {
      for (const object of canvas.getObjects()) {
        if (object instanceof LeaderTextWithArrow) {
          object.syncSelectionVisuals();
        }
      }
      canvas.requestRenderAll();
    };

    const updateLeaderHoverStates = (scenePoint?: Point) => {
      let didUpdate = false;

      for (const object of canvas.getObjects()) {
        if (!(object instanceof LeaderTextWithArrow)) {
          continue;
        }

        const isHovered = scenePoint
          ? object.isPointOnTextBox(scenePoint) ||
            object.isPointOnCreateLeaderHandle(scenePoint, false)
          : false;
        didUpdate = object.setTextBoxHoverState(isHovered) || didUpdate;
      }

      if (didUpdate) {
        canvas.requestRenderAll();
      }
    };

    const handleObjectMoving = (event: { target?: FabricObject }) => {
      const target = event.target;
      if (!target) {
        return;
      }

      (target as TransformableFabricObject).transformMatrix = undefined;
      if (target instanceof LeaderTextWithArrow) {
        target.syncLeaderToAbsoluteEndpoint();
        canvas.requestRenderAll();
      }
    };

    const handleObjectModified = (event: { target?: FabricObject }) => {
      const target = event.target;
      if (!target) {
        return;
      }

      applyObjectBehaviorRules(target);
      bakeGeometryIntoObject(target);
      canvas.requestRenderAll();
    };

    const handleObjectScaling = (event: { target?: FabricObject }) => {
      const target = event.target;
      if (!target) {
        return;
      }

      applyObjectBehaviorRules(target);
      bakeGeometryIntoObject(target);
      canvas.requestRenderAll();
    };

    const handleObjectAdded = (event: { target?: FabricObject }) => {
      const target = event.target;
      if (!target) {
        return;
      }

      applyObjectBehaviorRules(target);
      if (target instanceof LeaderTextWithArrow) {
        target.syncSelectionVisuals();
      }
    };

    const handleMouseDoubleClick = (event: { target?: FabricObject }) => {
      const target = event.target;
      if (!(target instanceof LeaderTextWithArrow)) {
        return;
      }

      target.startTextEditing();
      refreshLeaderSelectionVisuals();
    };

    const handleMouseDown = (event: {
      target?: FabricObject;
      scenePoint?: Point;
    }) => {
      if (!event.scenePoint) {
        return;
      }

      if (placingLeaderTarget) {
        placingLeaderTarget.commitLeaderEndpointPlacement(event.scenePoint);
        placingLeaderTarget = null;
        isPlacementPointerDown = false;
        didDragDuringPlacementPointerDown = false;
        placementPointerDownStart = null;
        setLeaderPlacementMode(false);
        updateLeaderHoverStates(event.scenePoint);
        canvas.requestRenderAll();
        return;
      }

      const objects = canvas.getObjects();
      for (let index = objects.length - 1; index >= 0; index -= 1) {
        const object = objects[index];
        if (!(object instanceof LeaderTextWithArrow)) {
          continue;
        }

        if (!object.isPointOnCreateLeaderHandle(event.scenePoint)) {
          continue;
        }

        canvas.setActiveObject(object);
        object.beginLeaderEndpointPlacement(event.scenePoint);
        placingLeaderTarget = object;
        isPlacementPointerDown = true;
        didDragDuringPlacementPointerDown = false;
        placementPointerDownStart = event.scenePoint.clone();
        setLeaderPlacementMode(true);
        updateLeaderHoverStates();
        refreshLeaderSelectionVisuals();
        return;
      }

      if (event.target) {
        return;
      }

      for (let index = objects.length - 1; index >= 0; index -= 1) {
        const object = objects[index];
        if (!(object instanceof LeaderTextWithArrow)) {
          continue;
        }

        if (!object.isPointOnLeaderArrow(event.scenePoint)) {
          continue;
        }

        canvas.setActiveObject(object);
        object.syncSelectionVisuals();
        canvas.requestRenderAll();
        return;
      }
    };

    const handleMouseMove = (event: { scenePoint?: Point; e?: Event }) => {
      if (placingLeaderTarget && event.scenePoint) {
        const pointerButtons =
          event.e && "buttons" in event.e && typeof event.e.buttons === "number"
            ? event.e.buttons
            : 0;
        if (
          isPlacementPointerDown &&
          placementPointerDownStart &&
          event.scenePoint.distanceFrom(placementPointerDownStart) > 0.0001 &&
          pointerButtons > 0
        ) {
          didDragDuringPlacementPointerDown = true;
        }
        placingLeaderTarget.updateLeaderEndpointPlacement(event.scenePoint);
        canvas.requestRenderAll();
        return;
      }

      updateLeaderHoverStates(event.scenePoint);
    };

    const handleMouseUp = (event: { scenePoint?: Point }) => {
      if (
        placingLeaderTarget &&
        isPlacementPointerDown &&
        didDragDuringPlacementPointerDown &&
        event.scenePoint
      ) {
        placingLeaderTarget.commitLeaderEndpointPlacement(event.scenePoint);
        placingLeaderTarget = null;
        setLeaderPlacementMode(false);
        updateLeaderHoverStates(event.scenePoint);
        canvas.requestRenderAll();
      }

      isPlacementPointerDown = false;
      didDragDuringPlacementPointerDown = false;
      placementPointerDownStart = null;
    };

    canvas.on("object:moving", handleObjectMoving);
    canvas.on("object:scaling", handleObjectScaling);
    canvas.on("object:modified", handleObjectModified);
    canvas.on("object:added", handleObjectAdded);
    canvas.on("mouse:dblclick", handleMouseDoubleClick);
    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);
    canvas.on("selection:created", refreshLeaderSelectionVisuals);
    canvas.on("selection:updated", refreshLeaderSelectionVisuals);
    canvas.on("selection:cleared", refreshLeaderSelectionVisuals);

    return () => {
      setLeaderPlacementMode(false);
      canvas.off("object:moving", handleObjectMoving);
      canvas.off("object:scaling", handleObjectScaling);
      canvas.off("object:modified", handleObjectModified);
      canvas.off("object:added", handleObjectAdded);
      canvas.off("mouse:dblclick", handleMouseDoubleClick);
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
      canvas.off("selection:created", refreshLeaderSelectionVisuals);
      canvas.off("selection:updated", refreshLeaderSelectionVisuals);
      canvas.off("selection:cleared", refreshLeaderSelectionVisuals);
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
      canvas.uniformScaling = false;
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

      if (initialModel !== undefined) {
        await canvas.loadFromJSON(
          initialModel as Parameters<Canvas["loadFromJSON"]>[0],
        );
        for (const object of canvas.getObjects()) {
          applyObjectBehaviorRules(object);
          bakeGeometryIntoObject(object);
        }
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
