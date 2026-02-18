"use client";

/**
 * Minimal Fabric.js canvas component that can initialize from a JSON model and
 * optional background image.
 */

import {
  useCallback,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  ArrowRight,
  Circle as CircleIcon,
  Eraser,
  Hand,
  MousePointer2,
  RotateCcw,
  Square as SquareIcon,
  Type,
} from "lucide-react";
import {
  ActiveSelection,
  Canvas,
  Circle,
  Ellipse,
  FabricImage,
  FabricObject,
  IText,
  InteractiveFabricObject,
  Point,
  Rect,
  type TMat2D,
} from "fabric";
import { LeaderTextWithArrow } from "@/components/fabric-leader-text-with-arrow";

import { cn } from "@/lib/utils";

const DARK_VIEWPORT_COLOR = "#2f2f2f";
const BORDER_COLOR = "#253ed3";
const GEOMETRY_EPSILON = 0.0001;
const DEFAULT_STROKE_COLOR = "#ffffff";
const DEFAULT_STROKE_WIDTH = 2;
const MIN_GEOMETRY_SIZE = 0.5;
const MIN_VIEWPORT_ZOOM = 0.1;
const MAX_VIEWPORT_ZOOM = 8;
const MIN_SCREEN_STROKE_WIDTH = 0.1;
const MIN_SCREEN_FONT_SIZE = 1;
const RESET_VIEWPORT_SHORTCUT = "z";
const DELETE_SHORTCUT_DISPLAY = "⌫";
const PINCH_ZOOM_SPEED_MULTIPLIER = 5;

type CanvasTool =
  | "pointer"
  | "hand"
  | "text"
  | "arrow"
  | "circle"
  | "ellipse"
  | "rectangle";

type ShapeTool = Exclude<CanvasTool, "pointer" | "hand" | "text">;

const TOOL_SHORTCUTS: Record<CanvasTool, string> = {
  pointer: "v",
  hand: "h",
  text: "t",
  arrow: "a",
  circle: "c",
  ellipse: "e",
  rectangle: "r",
};

/** Ref API for `FabricJsonCanvas`. */
export interface FabricJsonCanvasHandle {}

/** Props for the minimal Fabric.js JSON canvas wrapper. */
export interface FabricJsonCanvasProps {
  /** Initial Fabric JSON model loaded with `Canvas.loadFromJSON()`. */
  initialModel?: unknown;
  /** Optional background image URL shown behind canvas objects. */
  backgroundImageUrl?: string;
  /**
   * Keep stroke widths and text sizes constant on screen regardless of viewport zoom.
   * Defaults to `true`.
   */
  constantScreenSize?: boolean;
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

type ScreenInvariantFabricObject = FabricObject & {
  __baseScreenStrokeWidth?: number;
  __baseScreenFontSize?: number;
  __baseScreenLeaderStrokeWidth?: number;
  __baseScreenLeaderFontSize?: number;
};

function EllipseToolIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <ellipse cx="12" cy="12" rx="8" ry="5" />
    </svg>
  );
}

function isShapeTool(tool: CanvasTool): tool is ShapeTool {
  return (
    tool === "arrow" ||
    tool === "circle" ||
    tool === "ellipse" ||
    tool === "rectangle"
  );
}

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
      rx: Math.max(MIN_GEOMETRY_SIZE, object.rx * nextScaleX),
      ry: Math.max(MIN_GEOMETRY_SIZE, object.ry * nextScaleY),
    });
  } else if (object instanceof Circle) {
    // Circle supports one radius, so we preserve circle geometry with average scale.
    const uniformScale = (nextScaleX + nextScaleY) / 2;
    object.set({
      radius: Math.max(MIN_GEOMETRY_SIZE, object.radius * uniformScale),
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

function clampViewportZoom(value: number) {
  return Math.min(MAX_VIEWPORT_ZOOM, Math.max(MIN_VIEWPORT_ZOOM, value));
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  );
}

function getObjectFontSize(object: FabricObject) {
  if (!("fontSize" in object)) {
    return null;
  }

  const fontSize = object.fontSize;
  return typeof fontSize === "number" && Number.isFinite(fontSize)
    ? fontSize
    : null;
}

function captureObjectScreenInvariantBaseMetrics(
  object: FabricObject,
  currentZoom: number,
  forceFromCurrent = false,
) {
  const zoom = Math.max(currentZoom, GEOMETRY_EPSILON);
  const screenInvariantObject = object as ScreenInvariantFabricObject;

  if (object instanceof LeaderTextWithArrow) {
    if (
      typeof object.leaderStrokeWidth === "number" &&
      Number.isFinite(object.leaderStrokeWidth) &&
      (forceFromCurrent ||
        screenInvariantObject.__baseScreenLeaderStrokeWidth === undefined)
    ) {
      screenInvariantObject.__baseScreenLeaderStrokeWidth = forceFromCurrent
        ? object.leaderStrokeWidth * zoom
        : object.leaderStrokeWidth;
    }

    if (
      typeof object.fontSize === "number" &&
      Number.isFinite(object.fontSize) &&
      (forceFromCurrent ||
        screenInvariantObject.__baseScreenLeaderFontSize === undefined)
    ) {
      screenInvariantObject.__baseScreenLeaderFontSize = forceFromCurrent
        ? object.fontSize * zoom
        : object.fontSize;
    }

    return;
  }

  if (
    typeof object.strokeWidth === "number" &&
    Number.isFinite(object.strokeWidth) &&
    (forceFromCurrent ||
      screenInvariantObject.__baseScreenStrokeWidth === undefined)
  ) {
    screenInvariantObject.__baseScreenStrokeWidth = forceFromCurrent
      ? object.strokeWidth * zoom
      : object.strokeWidth;
  }

  const fontSize = getObjectFontSize(object);
  if (
    fontSize !== null &&
    (forceFromCurrent ||
      screenInvariantObject.__baseScreenFontSize === undefined)
  ) {
    screenInvariantObject.__baseScreenFontSize = forceFromCurrent
      ? fontSize * zoom
      : fontSize;
  }
}

function applyObjectScreenInvariantMetrics(
  object: FabricObject,
  currentZoom: number,
) {
  const zoom = Math.max(currentZoom, GEOMETRY_EPSILON);
  const screenInvariantObject = object as ScreenInvariantFabricObject;

  if (object instanceof LeaderTextWithArrow) {
    if (
      typeof screenInvariantObject.__baseScreenLeaderStrokeWidth === "number"
    ) {
      object.setLeaderStrokeWidth(
        Math.max(
          MIN_SCREEN_STROKE_WIDTH,
          screenInvariantObject.__baseScreenLeaderStrokeWidth / zoom,
        ),
      );
    }

    if (typeof screenInvariantObject.__baseScreenLeaderFontSize === "number") {
      object.setFontSize(
        Math.max(
          MIN_SCREEN_FONT_SIZE,
          screenInvariantObject.__baseScreenLeaderFontSize / zoom,
        ),
      );
    }

    object.setCoords();
    return;
  }

  if (typeof screenInvariantObject.__baseScreenStrokeWidth === "number") {
    object.set({
      strokeWidth: Math.max(
        MIN_SCREEN_STROKE_WIDTH,
        screenInvariantObject.__baseScreenStrokeWidth / zoom,
      ),
    });
  }

  if (
    typeof screenInvariantObject.__baseScreenFontSize === "number" &&
    "fontSize" in object
  ) {
    object.set({
      fontSize: Math.max(
        MIN_SCREEN_FONT_SIZE,
        screenInvariantObject.__baseScreenFontSize / zoom,
      ),
    });
  }

  object.setCoords();
}

function restoreObjectScreenInvariantBaseMetrics(object: FabricObject) {
  const screenInvariantObject = object as ScreenInvariantFabricObject;

  if (object instanceof LeaderTextWithArrow) {
    if (
      typeof screenInvariantObject.__baseScreenLeaderStrokeWidth === "number"
    ) {
      object.setLeaderStrokeWidth(
        Math.max(
          MIN_SCREEN_STROKE_WIDTH,
          screenInvariantObject.__baseScreenLeaderStrokeWidth,
        ),
      );
    }

    if (typeof screenInvariantObject.__baseScreenLeaderFontSize === "number") {
      object.setFontSize(
        Math.max(
          MIN_SCREEN_FONT_SIZE,
          screenInvariantObject.__baseScreenLeaderFontSize,
        ),
      );
    }

    object.setCoords();
    return;
  }

  if (typeof screenInvariantObject.__baseScreenStrokeWidth === "number") {
    object.set({
      strokeWidth: Math.max(
        MIN_SCREEN_STROKE_WIDTH,
        screenInvariantObject.__baseScreenStrokeWidth,
      ),
    });
  }

  if (
    typeof screenInvariantObject.__baseScreenFontSize === "number" &&
    "fontSize" in object
  ) {
    object.set({
      fontSize: Math.max(
        MIN_SCREEN_FONT_SIZE,
        screenInvariantObject.__baseScreenFontSize,
      ),
    });
  }

  object.setCoords();
}

function applyScreenInvariantMetricsToCanvas(
  canvas: Canvas,
  forceBaseFromCurrent = false,
) {
  const zoom = canvas.getZoom();
  for (const object of canvas.getObjects()) {
    captureObjectScreenInvariantBaseMetrics(object, zoom, forceBaseFromCurrent);
    applyObjectScreenInvariantMetrics(object, zoom);
  }
}

function restoreScreenInvariantMetricsOnCanvas(canvas: Canvas) {
  for (const object of canvas.getObjects()) {
    restoreObjectScreenInvariantBaseMetrics(object);
  }
}

function createTextLeaderAt(point: Point) {
  return new LeaderTextWithArrow({
    left: point.x,
    top: point.y,
    text: "Text",
    leaderEnds: [],
    textFill: DEFAULT_STROKE_COLOR,
    leaderStroke: DEFAULT_STROKE_COLOR,
    leaderStrokeWidth: DEFAULT_STROKE_WIDTH,
  });
}

function createObjectFromTool(
  tool: ShapeTool,
  startPoint: Point,
  endPoint: Point,
): FabricObject | null {
  if (tool === "arrow") {
    if (startPoint.distanceFrom(endPoint) < MIN_GEOMETRY_SIZE) {
      return null;
    }

    return new LeaderTextWithArrow({
      left: startPoint.x,
      top: startPoint.y,
      text: "",
      leaderEnds: [{ x: endPoint.x, y: endPoint.y }],
      textFill: DEFAULT_STROKE_COLOR,
      leaderStroke: DEFAULT_STROKE_COLOR,
      leaderStrokeWidth: DEFAULT_STROKE_WIDTH,
    });
  }

  if (tool === "circle") {
    const radius = startPoint.distanceFrom(endPoint);
    if (radius < MIN_GEOMETRY_SIZE) {
      return null;
    }

    return new Circle({
      left: startPoint.x,
      top: startPoint.y,
      originX: "center",
      originY: "center",
      radius,
      fill: "transparent",
      stroke: DEFAULT_STROKE_COLOR,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      strokeUniform: true,
    });
  }

  const left = Math.min(startPoint.x, endPoint.x);
  const top = Math.min(startPoint.y, endPoint.y);
  const width = Math.abs(endPoint.x - startPoint.x);
  const height = Math.abs(endPoint.y - startPoint.y);

  if (width < MIN_GEOMETRY_SIZE || height < MIN_GEOMETRY_SIZE) {
    return null;
  }

  if (tool === "ellipse") {
    return new Ellipse({
      left: left + width / 2,
      top: top + height / 2,
      originX: "center",
      originY: "center",
      rx: width / 2,
      ry: height / 2,
      fill: "transparent",
      stroke: DEFAULT_STROKE_COLOR,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      strokeUniform: true,
    });
  }

  return new Rect({
    left,
    top,
    width,
    height,
    originX: "left",
    originY: "top",
    fill: "transparent",
    stroke: DEFAULT_STROKE_COLOR,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    strokeUniform: true,
  });
}

function updatePreviewObjectFromTool(
  tool: ShapeTool,
  previewObject: FabricObject,
  startPoint: Point,
  endPoint: Point,
) {
  if (tool === "arrow" && previewObject instanceof LeaderTextWithArrow) {
    previewObject.set({
      left: startPoint.x,
      top: startPoint.y,
    });
    previewObject.setTextContent("");
    previewObject.setLeaderEnds([{ x: endPoint.x, y: endPoint.y }]);
    return;
  }

  if (tool === "circle" && previewObject instanceof Circle) {
    previewObject.set({
      left: startPoint.x,
      top: startPoint.y,
      originX: "center",
      originY: "center",
      radius: Math.max(MIN_GEOMETRY_SIZE, startPoint.distanceFrom(endPoint)),
    });
    previewObject.setCoords();
    return;
  }

  const left = Math.min(startPoint.x, endPoint.x);
  const top = Math.min(startPoint.y, endPoint.y);
  const width = Math.max(
    MIN_GEOMETRY_SIZE,
    Math.abs(endPoint.x - startPoint.x),
  );
  const height = Math.max(
    MIN_GEOMETRY_SIZE,
    Math.abs(endPoint.y - startPoint.y),
  );

  if (tool === "ellipse" && previewObject instanceof Ellipse) {
    previewObject.set({
      left: left + width / 2,
      top: top + height / 2,
      originX: "center",
      originY: "center",
      rx: width / 2,
      ry: height / 2,
    });
    previewObject.setCoords();
    return;
  }

  if (tool === "rectangle" && previewObject instanceof Rect) {
    previewObject.set({
      left,
      top,
      originX: "left",
      originY: "top",
      width,
      height,
    });
    previewObject.setCoords();
  }
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
    constantScreenSize = true,
    viewportWidth = 960,
    viewportHeight = 540,
    className,
  },
  ref,
) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const applyInteractionModeRef = useRef<(() => void) | null>(null);
  const defaultViewportTransformRef = useRef<TMat2D>([1, 0, 0, 1, 0, 0]);
  const constantScreenSizeRef = useRef(constantScreenSize);
  const activeToolRef = useRef<CanvasTool>("pointer");
  const isPointerOverCanvasRef = useRef(false);

  const [activeTool, setActiveTool] = useState<CanvasTool>("pointer");
  const [canDeleteSelection, setCanDeleteSelection] = useState(false);

  useImperativeHandle(ref, () => ({}), []);

  const resetViewport = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      return;
    }

    const [a, b, c, d, e, f] = defaultViewportTransformRef.current;
    canvas.setViewportTransform([a, b, c, d, e, f]);
    if (constantScreenSizeRef.current) {
      applyScreenInvariantMetricsToCanvas(canvas);
    }
    canvas.requestRenderAll();
  }, []);

  const deleteSelection = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      return;
    }

    const activeObject = canvas.getActiveObject();
    if (activeObject instanceof IText && activeObject.isEditing) {
      return;
    }

    const selectedObjects = canvas.getActiveObjects();
    if (selectedObjects.length === 0) {
      return;
    }

    canvas.discardActiveObject();
    for (const object of selectedObjects) {
      canvas.remove(object);
    }
    setCanDeleteSelection(false);
    canvas.requestRenderAll();
  }, []);

  useEffect(() => {
    const previouslyEnabled = constantScreenSizeRef.current;
    constantScreenSizeRef.current = constantScreenSize;
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      return;
    }

    if (constantScreenSize) {
      applyScreenInvariantMetricsToCanvas(canvas, !previouslyEnabled);
    } else if (previouslyEnabled) {
      restoreScreenInvariantMetricsOnCanvas(canvas);
    }

    canvas.requestRenderAll();
  }, [constantScreenSize]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      const canvas = fabricCanvasRef.current;
      if (canvas?.getActiveObject()?.type === "i-text") {
        return;
      }

      const pressedKey = event.key.toLowerCase();
      if (event.key === "Backspace" || event.key === "Delete") {
        if (canvas?.getActiveObjects().length) {
          event.preventDefault();
          deleteSelection();
        }
        return;
      }

      if (pressedKey === RESET_VIEWPORT_SHORTCUT) {
        event.preventDefault();
        resetViewport();
        return;
      }

      for (const [tool, shortcut] of Object.entries(TOOL_SHORTCUTS)) {
        if (pressedKey !== shortcut) {
          continue;
        }

        event.preventDefault();
        setActiveTool(tool as CanvasTool);
        break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteSelection, resetViewport]);

  useEffect(() => {
    activeToolRef.current = activeTool;
    applyInteractionModeRef.current?.();
  }, [activeTool]);

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

    const resolveEffectiveTool = () => activeToolRef.current;

    let previousActiveTool = activeToolRef.current;

    let placingLeaderTarget: LeaderTextWithArrow | null = null;
    let isPlacementPointerDown = false;
    let didDragDuringPlacementPointerDown = false;
    let placementPointerDownStart: Point | null = null;
    let previousPlacementLockMovementX: boolean | undefined;
    let previousPlacementLockMovementY: boolean | undefined;

    let isPanningViewport = false;
    let panClientPoint: { x: number; y: number } | null = null;

    let isShapePointerDown = false;
    let shapeDidDrag = false;
    let shapePointerDownStart: Point | null = null;
    let shapeToolAtPointerDown: ShapeTool | null = null;
    let shapePreviewObject: FabricObject | null = null;
    let pendingShapeStart: { tool: ShapeTool; point: Point } | null = null;
    let pinchGestureLastScale: number | null = null;

    const syncSelectionState = () => {
      const activeObject = canvas.getActiveObject();
      const isEditingText =
        activeObject instanceof IText && activeObject.isEditing;
      setCanDeleteSelection(
        canvas.getActiveObjects().length > 0 && !isEditingText,
      );
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

    const refreshLeaderSelectionVisuals = () => {
      for (const object of canvas.getObjects()) {
        if (object instanceof LeaderTextWithArrow) {
          object.syncSelectionVisuals();
        }
      }
      canvas.requestRenderAll();
    };

    const updateCanvasCursor = (scenePoint?: Point) => {
      const effectiveTool = resolveEffectiveTool();
      let nextCursor = "default";

      if (effectiveTool === "hand") {
        nextCursor = isPanningViewport ? "grabbing" : "grab";
      } else if (effectiveTool === "pointer") {
        let isOverCreateHandle = false;

        if (scenePoint && !placingLeaderTarget) {
          const objects = canvas.getObjects();
          for (let index = objects.length - 1; index >= 0; index -= 1) {
            const object = objects[index];
            if (
              object instanceof LeaderTextWithArrow &&
              object.isPointOnCreateLeaderHandle(scenePoint)
            ) {
              isOverCreateHandle = true;
              break;
            }
          }
        }

        nextCursor = isOverCreateHandle ? "crosshair" : "default";
      } else {
        nextCursor = "crosshair";
      }

      if (canvas.upperCanvasEl.style.cursor !== nextCursor) {
        canvas.upperCanvasEl.style.cursor = nextCursor;
      }
      canvas.defaultCursor = nextCursor;
      canvas.hoverCursor = nextCursor;
    };

    const clearShapePreviewObject = () => {
      if (!shapePreviewObject) {
        return;
      }

      canvas.remove(shapePreviewObject);
      shapePreviewObject = null;
    };

    const clearShapePointerDownState = () => {
      isShapePointerDown = false;
      shapeDidDrag = false;
      shapePointerDownStart = null;
      shapeToolAtPointerDown = null;
    };

    const clearPendingShapeStart = () => {
      pendingShapeStart = null;
    };

    const stopViewportPanning = () => {
      isPanningViewport = false;
      panClientPoint = null;
    };

    const zoomViewportToPoint = (
      pointOnViewportPlane: Point,
      nextZoom: number,
    ) => {
      canvas.zoomToPoint(pointOnViewportPlane, clampViewportZoom(nextZoom));
      if (constantScreenSizeRef.current) {
        applyScreenInvariantMetricsToCanvas(canvas);
      }
      canvas.requestRenderAll();
    };

    const setLeaderPlacementMode = () => {
      const isPointerMode = resolveEffectiveTool() === "pointer";
      canvas.selection = isPointerMode && !placingLeaderTarget;
    };

    const beginLeaderPlacement = (
      object: LeaderTextWithArrow,
      startPoint: Point,
    ) => {
      canvas.setActiveObject(object);
      previousPlacementLockMovementX = object.lockMovementX;
      previousPlacementLockMovementY = object.lockMovementY;
      object.set({
        lockMovementX: true,
        lockMovementY: true,
      });
      object.beginLeaderEndpointPlacement(startPoint);
      placingLeaderTarget = object;
      isPlacementPointerDown = true;
      didDragDuringPlacementPointerDown = false;
      placementPointerDownStart = startPoint.clone();
      setLeaderPlacementMode();
      updateLeaderHoverStates();
      refreshLeaderSelectionVisuals();
      updateCanvasCursor(startPoint);
    };

    const endLeaderPlacement = (
      options: {
        commit?: boolean;
        scenePoint?: Point;
      } = {},
    ) => {
      const target = placingLeaderTarget;
      if (!target) {
        return;
      }

      if (options.commit && options.scenePoint) {
        target.commitLeaderEndpointPlacement(options.scenePoint);
      }

      target.set({
        lockMovementX: previousPlacementLockMovementX ?? false,
        lockMovementY: previousPlacementLockMovementY ?? false,
      });

      placingLeaderTarget = null;
      previousPlacementLockMovementX = undefined;
      previousPlacementLockMovementY = undefined;
      isPlacementPointerDown = false;
      didDragDuringPlacementPointerDown = false;
      placementPointerDownStart = null;
      setLeaderPlacementMode();
      if (options.commit) {
        canvas.setActiveObject(target);
        target.syncSelectionVisuals();
      }
      updateLeaderHoverStates(options.scenePoint);
      updateCanvasCursor(options.scenePoint);
      canvas.requestRenderAll();
    };

    const createPreviewObjectForTool = (tool: ShapeTool, startPoint: Point) => {
      let previewObject: FabricObject;

      if (tool === "arrow") {
        previewObject = new LeaderTextWithArrow({
          left: startPoint.x,
          top: startPoint.y,
          text: "",
          leaderEnds: [
            { x: startPoint.x + MIN_GEOMETRY_SIZE, y: startPoint.y },
          ],
          textFill: DEFAULT_STROKE_COLOR,
          leaderStroke: DEFAULT_STROKE_COLOR,
          leaderStrokeWidth: DEFAULT_STROKE_WIDTH,
        });
      } else if (tool === "circle") {
        previewObject = new Circle({
          left: startPoint.x,
          top: startPoint.y,
          originX: "center",
          originY: "center",
          radius: MIN_GEOMETRY_SIZE,
          fill: "transparent",
          stroke: DEFAULT_STROKE_COLOR,
          strokeWidth: DEFAULT_STROKE_WIDTH,
          strokeUniform: true,
        });
      } else if (tool === "ellipse") {
        previewObject = new Ellipse({
          left: startPoint.x,
          top: startPoint.y,
          originX: "center",
          originY: "center",
          rx: MIN_GEOMETRY_SIZE,
          ry: MIN_GEOMETRY_SIZE,
          fill: "transparent",
          stroke: DEFAULT_STROKE_COLOR,
          strokeWidth: DEFAULT_STROKE_WIDTH,
          strokeUniform: true,
        });
      } else {
        previewObject = new Rect({
          left: startPoint.x,
          top: startPoint.y,
          originX: "left",
          originY: "top",
          width: MIN_GEOMETRY_SIZE,
          height: MIN_GEOMETRY_SIZE,
          fill: "transparent",
          stroke: DEFAULT_STROKE_COLOR,
          strokeWidth: DEFAULT_STROKE_WIDTH,
          strokeUniform: true,
        });
      }

      previewObject.set({
        selectable: false,
        evented: false,
      });
      applyObjectBehaviorRules(previewObject);
      canvas.add(previewObject);
      return previewObject;
    };

    const addCommittedObject = (object: FabricObject) => {
      object.set({
        selectable: true,
        evented: true,
      });
      applyObjectBehaviorRules(object);
      canvas.add(object);
      canvas.requestRenderAll();
    };

    const commitShapeDragPreview = (
      tool: ShapeTool,
      startPoint: Point,
      endPoint: Point,
    ) => {
      const createdObject = createObjectFromTool(tool, startPoint, endPoint);
      clearShapePreviewObject();
      if (!createdObject) {
        return;
      }

      addCommittedObject(createdObject);
      canvas.setActiveObject(createdObject);
      canvas.requestRenderAll();
    };

    const applyInteractionMode = () => {
      const effectiveTool = resolveEffectiveTool();
      const activeToolFromToolbar = activeToolRef.current;

      if (activeToolFromToolbar !== previousActiveTool) {
        previousActiveTool = activeToolFromToolbar;
        clearShapePreviewObject();
        clearShapePointerDownState();
        clearPendingShapeStart();
      }

      if (effectiveTool !== "pointer" && placingLeaderTarget) {
        endLeaderPlacement();
      }

      if (effectiveTool !== "hand") {
        stopViewportPanning();
      }

      const isPointerMode = effectiveTool === "pointer";
      canvas.skipTargetFind = !isPointerMode;
      canvas.selection = isPointerMode && !placingLeaderTarget;

      if (!isPointerMode) {
        canvas.discardActiveObject();
        updateLeaderHoverStates();
      }

      updateCanvasCursor();
      canvas.requestRenderAll();
    };

    applyInteractionModeRef.current = applyInteractionMode;
    applyInteractionMode();

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

      if (target instanceof ActiveSelection) {
        for (const object of target.getObjects()) {
          applyObjectBehaviorRules(object);
          bakeGeometryIntoObject(object);
          if (constantScreenSizeRef.current) {
            captureObjectScreenInvariantBaseMetrics(
              object,
              canvas.getZoom(),
              true,
            );
            applyObjectScreenInvariantMetrics(object, canvas.getZoom());
          }
        }
        target.setCoords();
        canvas.requestRenderAll();
        return;
      }

      applyObjectBehaviorRules(target);
      bakeGeometryIntoObject(target);
      if (constantScreenSizeRef.current) {
        captureObjectScreenInvariantBaseMetrics(target, canvas.getZoom(), true);
        applyObjectScreenInvariantMetrics(target, canvas.getZoom());
      }
      canvas.requestRenderAll();
    };

    const handleObjectScaling = (event: { target?: FabricObject }) => {
      const target = event.target;
      if (!target) {
        return;
      }

      if (target instanceof ActiveSelection) {
        return;
      }

      applyObjectBehaviorRules(target);
      bakeGeometryIntoObject(target);
      if (constantScreenSizeRef.current) {
        captureObjectScreenInvariantBaseMetrics(target, canvas.getZoom(), true);
        applyObjectScreenInvariantMetrics(target, canvas.getZoom());
      }
      canvas.requestRenderAll();
    };

    const handleObjectAdded = (event: { target?: FabricObject }) => {
      const target = event.target;
      if (!target) {
        return;
      }

      applyObjectBehaviorRules(target);
      if (constantScreenSizeRef.current) {
        captureObjectScreenInvariantBaseMetrics(
          target,
          canvas.getZoom(),
          target instanceof IText,
        );
        applyObjectScreenInvariantMetrics(target, canvas.getZoom());
      }
      if (target instanceof LeaderTextWithArrow) {
        target.syncSelectionVisuals();
      }
      syncSelectionState();
    };

    const handleSelectionCreated = () => {
      refreshLeaderSelectionVisuals();
      syncSelectionState();
    };

    const handleSelectionUpdated = () => {
      refreshLeaderSelectionVisuals();
      syncSelectionState();
    };

    const handleSelectionCleared = () => {
      refreshLeaderSelectionVisuals();
      syncSelectionState();
    };

    const handleMouseDoubleClick = (event: { target?: FabricObject }) => {
      if (resolveEffectiveTool() !== "pointer") {
        return;
      }

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
      e?: Event;
    }) => {
      const scenePoint = event.scenePoint;
      if (!scenePoint) {
        return;
      }

      const effectiveTool = resolveEffectiveTool();

      if (effectiveTool === "hand") {
        const pointerEvent = event.e;
        if (pointerEvent instanceof MouseEvent) {
          isPanningViewport = true;
          panClientPoint = {
            x: pointerEvent.clientX,
            y: pointerEvent.clientY,
          };
          updateCanvasCursor(scenePoint);
        }
        return;
      }

      if (effectiveTool === "text") {
        const leader = createTextLeaderAt(scenePoint);
        addCommittedObject(leader);
        canvas.setActiveObject(leader);
        leader.startTextEditing();
        refreshLeaderSelectionVisuals();
        updateCanvasCursor(scenePoint);
        return;
      }

      if (isShapeTool(effectiveTool)) {
        isShapePointerDown = true;
        shapeDidDrag = false;
        shapePointerDownStart = scenePoint.clone();
        shapeToolAtPointerDown = effectiveTool;
        const pendingStart =
          pendingShapeStart?.tool === effectiveTool ? pendingShapeStart : null;
        if (pendingStart) {
          if (!shapePreviewObject) {
            shapePreviewObject = createPreviewObjectForTool(
              effectiveTool,
              pendingStart.point,
            );
          }
          if (shapePreviewObject) {
            updatePreviewObjectFromTool(
              effectiveTool,
              shapePreviewObject,
              pendingStart.point,
              scenePoint,
            );
          }
        } else {
          clearShapePreviewObject();
          shapePreviewObject = createPreviewObjectForTool(
            effectiveTool,
            scenePoint,
          );
        }
        updateCanvasCursor(scenePoint);
        return;
      }

      // Pointer mode
      if (placingLeaderTarget) {
        endLeaderPlacement({
          commit: true,
          scenePoint,
        });
        return;
      }

      const objects = canvas.getObjects();
      for (let index = objects.length - 1; index >= 0; index -= 1) {
        const object = objects[index];
        if (!(object instanceof LeaderTextWithArrow)) {
          continue;
        }

        if (object.isPointOnEditTextHandle(scenePoint)) {
          canvas.setActiveObject(object);
          object.startTextEditing();
          refreshLeaderSelectionVisuals();
          updateCanvasCursor(scenePoint);
          return;
        }

        if (!object.isPointOnCreateLeaderHandle(scenePoint)) {
          continue;
        }

        beginLeaderPlacement(object, scenePoint);
        return;
      }

      if (event.target) {
        updateCanvasCursor(scenePoint);
        return;
      }

      for (let index = objects.length - 1; index >= 0; index -= 1) {
        const object = objects[index];
        if (!(object instanceof LeaderTextWithArrow)) {
          continue;
        }

        if (!object.isPointOnLeaderArrow(scenePoint)) {
          continue;
        }

        canvas.setActiveObject(object);
        object.syncSelectionVisuals();
        canvas.requestRenderAll();
        updateCanvasCursor(scenePoint);
        return;
      }

      updateCanvasCursor(scenePoint);
    };

    const handleMouseMove = (event: { scenePoint?: Point; e?: Event }) => {
      const scenePoint = event.scenePoint;
      const effectiveTool = resolveEffectiveTool();

      if (effectiveTool === "hand") {
        if (
          !isPanningViewport ||
          !panClientPoint ||
          !(event.e instanceof MouseEvent)
        ) {
          updateCanvasCursor(scenePoint);
          return;
        }

        const deltaX = event.e.clientX - panClientPoint.x;
        const deltaY = event.e.clientY - panClientPoint.y;
        const viewportTransform = canvas.viewportTransform;
        if (viewportTransform) {
          viewportTransform[4] += deltaX;
          viewportTransform[5] += deltaY;
        }

        panClientPoint = {
          x: event.e.clientX,
          y: event.e.clientY,
        };
        updateCanvasCursor(scenePoint);
        canvas.requestRenderAll();
        return;
      }

      if (isShapeTool(effectiveTool)) {
        if (
          isShapePointerDown &&
          shapeToolAtPointerDown === effectiveTool &&
          scenePoint &&
          shapePointerDownStart &&
          shapePreviewObject
        ) {
          const pendingStart =
            pendingShapeStart?.tool === effectiveTool
              ? pendingShapeStart
              : null;
          const previewStartPoint = pendingStart
            ? pendingStart.point
            : shapePointerDownStart;
          const pointerButtons =
            event.e &&
            "buttons" in event.e &&
            typeof event.e.buttons === "number"
              ? event.e.buttons
              : 0;
          if (
            scenePoint.distanceFrom(shapePointerDownStart) > GEOMETRY_EPSILON &&
            pointerButtons > 0
          ) {
            shapeDidDrag = true;
          }

          updatePreviewObjectFromTool(
            effectiveTool,
            shapePreviewObject,
            previewStartPoint,
            scenePoint,
          );
          canvas.requestRenderAll();
        }

        if (
          !isShapePointerDown &&
          pendingShapeStart &&
          pendingShapeStart.tool === effectiveTool &&
          scenePoint
        ) {
          if (!shapePreviewObject) {
            shapePreviewObject = createPreviewObjectForTool(
              effectiveTool,
              pendingShapeStart.point,
            );
          }
          if (shapePreviewObject) {
            updatePreviewObjectFromTool(
              effectiveTool,
              shapePreviewObject,
              pendingShapeStart.point,
              scenePoint,
            );
            canvas.requestRenderAll();
          }
        }

        updateCanvasCursor(scenePoint);
        return;
      }

      // Pointer mode
      if (placingLeaderTarget && scenePoint) {
        const pointerButtons =
          event.e && "buttons" in event.e && typeof event.e.buttons === "number"
            ? event.e.buttons
            : 0;
        if (
          isPlacementPointerDown &&
          placementPointerDownStart &&
          scenePoint.distanceFrom(placementPointerDownStart) >
            GEOMETRY_EPSILON &&
          pointerButtons > 0
        ) {
          didDragDuringPlacementPointerDown = true;
        }
        placingLeaderTarget.updateLeaderEndpointPlacement(scenePoint);
        updateCanvasCursor(scenePoint);
        canvas.requestRenderAll();
        return;
      }

      updateLeaderHoverStates(scenePoint);
      updateCanvasCursor(scenePoint);
    };

    const handleMouseWheel = (event: {
      e?: WheelEvent;
      viewportPoint?: Point;
      scenePoint?: Point;
    }) => {
      const wheelEvent = event.e;
      if (!(wheelEvent instanceof WheelEvent)) {
        return;
      }

      wheelEvent.preventDefault();
      wheelEvent.stopPropagation();
      if (wheelEvent.ctrlKey) {
        // Trackpad pinch: zoom around current pointer.
        const zoomFactor = Math.pow(
          0.999,
          wheelEvent.deltaY * PINCH_ZOOM_SPEED_MULTIPLIER,
        );
        const nextZoom = canvas.getZoom() * zoomFactor;
        const zoomPoint =
          event.viewportPoint ??
          new Point(
            wheelEvent.offsetX ?? canvas.getWidth() / 2,
            wheelEvent.offsetY ?? canvas.getHeight() / 2,
          );
        zoomViewportToPoint(zoomPoint, nextZoom);
      } else {
        // Two-finger trackpad drag: pan viewport.
        const viewportTransform = canvas.viewportTransform;
        if (viewportTransform) {
          const modeScale =
            wheelEvent.deltaMode === 1
              ? 16
              : wheelEvent.deltaMode === 2
                ? canvas.getHeight()
                : 1;
          viewportTransform[4] -= wheelEvent.deltaX * modeScale;
          viewportTransform[5] -= wheelEvent.deltaY * modeScale;
          canvas.requestRenderAll();
        }
      }
      updateCanvasCursor(event.scenePoint);
    };

    const handlePinch = (event: {
      e?: Event;
      scale?: number;
      viewportPoint?: Point;
      scenePoint?: Point;
    }) => {
      const scale = event.scale;
      if (
        typeof scale !== "number" ||
        !Number.isFinite(scale) ||
        scale <= GEOMETRY_EPSILON
      ) {
        return;
      }

      const relativeScale = pinchGestureLastScale
        ? scale / pinchGestureLastScale
        : 1;
      pinchGestureLastScale = scale;
      const acceleratedRelativeScale = Math.pow(
        relativeScale,
        PINCH_ZOOM_SPEED_MULTIPLIER,
      );

      const zoomPoint =
        event.viewportPoint ??
        new Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
      zoomViewportToPoint(
        zoomPoint,
        canvas.getZoom() * acceleratedRelativeScale,
      );
      event.e?.preventDefault();
      updateCanvasCursor(event.scenePoint);
    };

    const handleMouseUp = (event: { scenePoint?: Point; e?: Event }) => {
      const scenePoint = event.scenePoint;
      const effectiveTool = resolveEffectiveTool();
      pinchGestureLastScale = null;

      if (effectiveTool === "hand") {
        stopViewportPanning();
        updateCanvasCursor(scenePoint);
        return;
      }

      if (isShapeTool(effectiveTool)) {
        if (
          !isShapePointerDown ||
          !shapeToolAtPointerDown ||
          !shapePointerDownStart
        ) {
          updateCanvasCursor(scenePoint);
          return;
        }

        const toolAtPointerDown = shapeToolAtPointerDown;
        const startPoint = shapePointerDownStart;
        const endPoint = scenePoint ?? startPoint;
        const didDragFromDistance =
          endPoint.distanceFrom(startPoint) >= MIN_GEOMETRY_SIZE;
        const pendingStart =
          pendingShapeStart?.tool === toolAtPointerDown
            ? pendingShapeStart
            : null;

        clearShapePointerDownState();

        if (pendingStart) {
          clearShapePreviewObject();
          const createdObject = createObjectFromTool(
            toolAtPointerDown,
            pendingStart.point,
            endPoint,
          );
          clearPendingShapeStart();
          if (createdObject) {
            addCommittedObject(createdObject);
          }
          updateCanvasCursor(scenePoint);
          return;
        }

        if (shapeDidDrag || didDragFromDistance) {
          clearPendingShapeStart();
          commitShapeDragPreview(toolAtPointerDown, startPoint, endPoint);
          updateCanvasCursor(scenePoint);
          return;
        }

        clearShapePreviewObject();

        pendingShapeStart = {
          tool: toolAtPointerDown,
          point: startPoint.clone(),
        };

        updateCanvasCursor(scenePoint);
        return;
      }

      if (
        placingLeaderTarget &&
        isPlacementPointerDown &&
        didDragDuringPlacementPointerDown &&
        scenePoint
      ) {
        endLeaderPlacement({
          commit: true,
          scenePoint,
        });
        return;
      }

      updateCanvasCursor(scenePoint);
    };

    canvas.on("object:moving", handleObjectMoving);
    canvas.on("object:scaling", handleObjectScaling);
    canvas.on("object:modified", handleObjectModified);
    canvas.on("object:added", handleObjectAdded);
    canvas.on("mouse:dblclick", handleMouseDoubleClick);
    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);
    canvas.on("mouse:wheel", handleMouseWheel);
    canvas.on("pinch", handlePinch);
    canvas.on("selection:created", handleSelectionCreated);
    canvas.on("selection:updated", handleSelectionUpdated);
    canvas.on("selection:cleared", handleSelectionCleared);
    syncSelectionState();

    const handleUpperCanvasMouseDownCapture = (event: MouseEvent) => {
      const activeObject = canvas.getActiveObject();
      if (!(activeObject instanceof IText) || !activeObject.isEditing) {
        return;
      }

      const scenePoint = canvas.getScenePoint(event);
      if (activeObject.containsPoint(scenePoint)) {
        return;
      }

      activeObject.exitEditing();
      syncSelectionState();
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    canvas.upperCanvasEl.addEventListener(
      "mousedown",
      handleUpperCanvasMouseDownCapture,
      true,
    );

    return () => {
      applyInteractionModeRef.current = null;
      clearShapePreviewObject();
      stopViewportPanning();
      endLeaderPlacement();

      canvas.off("object:moving", handleObjectMoving);
      canvas.off("object:scaling", handleObjectScaling);
      canvas.off("object:modified", handleObjectModified);
      canvas.off("object:added", handleObjectAdded);
      canvas.off("mouse:dblclick", handleMouseDoubleClick);
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
      canvas.off("mouse:wheel", handleMouseWheel);
      canvas.off("pinch", handlePinch);
      canvas.off("selection:created", handleSelectionCreated);
      canvas.off("selection:updated", handleSelectionUpdated);
      canvas.off("selection:cleared", handleSelectionCleared);
      canvas.upperCanvasEl.removeEventListener(
        "mousedown",
        handleUpperCanvasMouseDownCapture,
        true,
      );
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

      const [a, b, c, d, e, f] = canvas.viewportTransform;
      defaultViewportTransformRef.current = [a, b, c, d, e, f];
      if (constantScreenSizeRef.current) {
        applyScreenInvariantMetricsToCanvas(canvas);
      }

      applyInteractionModeRef.current?.();
      setCanDeleteSelection(false);
      canvas.requestRenderAll();
    };

    void initializeCanvas();

    return () => {
      cancelled = true;
    };
  }, [backgroundImageUrl, initialModel, viewportHeight, viewportWidth]);

  const toolbarItems: Array<{
    tool: CanvasTool;
    label: string;
    shortcut: string;
    icon: ReactNode;
  }> = [
    {
      tool: "pointer",
      label: "Pointer",
      shortcut: TOOL_SHORTCUTS.pointer,
      icon: <MousePointer2 className="h-4 w-4" />,
    },
    {
      tool: "hand",
      label: "Hand",
      shortcut: TOOL_SHORTCUTS.hand,
      icon: <Hand className="h-4 w-4" />,
    },
    {
      tool: "text",
      label: "Text",
      shortcut: TOOL_SHORTCUTS.text,
      icon: <Type className="h-4 w-4" />,
    },
    {
      tool: "arrow",
      label: "Arrow",
      shortcut: TOOL_SHORTCUTS.arrow,
      icon: <ArrowRight className="h-4 w-4" />,
    },
    {
      tool: "circle",
      label: "Circle",
      shortcut: TOOL_SHORTCUTS.circle,
      icon: <CircleIcon className="h-4 w-4" />,
    },
    {
      tool: "ellipse",
      label: "Ellipse",
      shortcut: TOOL_SHORTCUTS.ellipse,
      icon: <EllipseToolIcon className="h-4 w-4" />,
    },
    {
      tool: "rectangle",
      label: "Rectangle",
      shortcut: TOOL_SHORTCUTS.rectangle,
      icon: <SquareIcon className="h-4 w-4" />,
    },
  ];

  const effectiveTool = activeTool;

  const canvasStyle: CSSProperties = {
    width: viewportWidth,
    height: viewportHeight,
  };

  return (
    <div
      className={cn("inline-flex items-stretch gap-2", className)}
      style={{ height: viewportHeight }}
    >
      <div className="flex w-10 flex-col items-center gap-1 rounded-md border border-border bg-[#262626] p-1">
        {toolbarItems.map((item) => {
          const isActive = item.tool === effectiveTool;
          const tooltipLabel = `${item.label} (${item.shortcut.toUpperCase()})`;
          return (
            <button
              key={item.tool}
              type="button"
              title={tooltipLabel}
              aria-label={tooltipLabel}
              onClick={() => setActiveTool(item.tool)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-sm border text-white transition-colors",
                isActive
                  ? "border-[#8aa0ff] bg-[#3a3a3a]"
                  : "border-transparent bg-transparent hover:bg-[#343434]",
              )}
            >
              {item.icon}
            </button>
          );
        })}
        <div className="my-1 h-px w-full bg-[#3a3a3a]" />
        <button
          type="button"
          title={`Reset Viewport (${RESET_VIEWPORT_SHORTCUT.toUpperCase()})`}
          aria-label={`Reset Viewport (${RESET_VIEWPORT_SHORTCUT.toUpperCase()})`}
          onClick={resetViewport}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-transparent bg-transparent text-white transition-colors hover:bg-[#343434]"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          title={`Delete (${DELETE_SHORTCUT_DISPLAY})`}
          aria-label={`Delete (${DELETE_SHORTCUT_DISPLAY})`}
          onClick={deleteSelection}
          disabled={!canDeleteSelection}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-sm border text-white transition-colors",
            canDeleteSelection
              ? "border-transparent bg-transparent hover:bg-[#343434]"
              : "cursor-not-allowed border-transparent bg-transparent text-white/35",
          )}
        >
          <Eraser className="h-4 w-4" />
        </button>
      </div>

      <div
        className="overflow-hidden rounded-md border border-border bg-[#2f2f2f]"
        style={canvasStyle}
        onMouseEnter={() => {
          isPointerOverCanvasRef.current = true;
        }}
        onMouseLeave={() => {
          isPointerOverCanvasRef.current = false;
        }}
      >
        <canvas ref={canvasElementRef} className="block h-full w-full" />
      </div>
    </div>
  );
});
