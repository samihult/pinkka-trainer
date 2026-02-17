"use client";

/**
 * Custom Fabric.js element composed of a text label and one or more leader arrows.
 * Each arrow start is fixed to the text midpoint and only endpoints are modeled.
 */

import {
  Control,
  FabricText,
  Group,
  IText,
  Point,
  classRegistry,
  util,
  type Abortable,
  type InteractiveFabricObject,
  type SerializedGroupProps,
  type TOptions,
} from "fabric";

/** One leader endpoint point in absolute canvas coordinates. */
export interface LeaderArrowEndpoint {
  /** Horizontal coordinate in canvas space. */
  x: number;
  /** Vertical coordinate in canvas space. */
  y: number;
}

/** Initialization options for the custom text + leader arrow element. */
export interface LeaderTextWithArrowOptions {
  /** Element left position in canvas coordinates. */
  left?: number;
  /** Element top position in canvas coordinates. */
  top?: number;
  /** Label text content. */
  text?: string;
  /** Legacy single leader endpoint in absolute canvas coordinates. */
  leaderEnd?: LeaderArrowEndpoint | null;
  /** Leader endpoints in absolute canvas coordinates. */
  leaderEnds?: LeaderArrowEndpoint[];
  /** Label fill color. */
  textFill?: string;
  /** Arrow stroke color. */
  leaderStroke?: string;
  /** Arrow stroke width. */
  leaderStrokeWidth?: number;
  /** Label font size. */
  fontSize?: number;
  /** Label font family. */
  fontFamily?: string;
  /** Label text alignment. */
  textAlign?: LeaderTextAlignment;
  /** Rotation angle in degrees. */
  angle?: number;
}

/** Serialized JSON shape of the custom text + leader arrow element. */
export interface SerializedLeaderTextWithArrow extends SerializedGroupProps {
  /** Registered Fabric type name for this custom class. */
  type: "leaderTextWithArrow";
  /** Label text content. */
  text: string;
  /** Legacy single leader endpoint in absolute canvas coordinates. */
  leaderEnd?: LeaderArrowEndpoint | null;
  /** Leader endpoints in absolute canvas coordinates. */
  leaderEnds?: LeaderArrowEndpoint[];
  /** Label fill color. */
  textFill: string;
  /** Arrow stroke color. */
  leaderStroke: string;
  /** Arrow stroke width. */
  leaderStrokeWidth: number;
  /** Label font size. */
  fontSize: number;
  /** Label font family. */
  fontFamily: string;
  /** Label text alignment. */
  textAlign: LeaderTextAlignment;
}

/** Supported text alignment values for the leader label. */
export type LeaderTextAlignment =
  | "left"
  | "center"
  | "right"
  | "justify"
  | "justify-left"
  | "justify-center"
  | "justify-right";

const DEFAULT_TEXT = "Text";
const DEFAULT_TEXT_FILL = "#f8fafc";
const DEFAULT_LEADER_STROKE = "#ffffff";
const DEFAULT_LEADER_STROKE_WIDTH = 5;
const DEFAULT_FONT_SIZE = 24;
const DEFAULT_FONT_FAMILY = "Arial";
const DEFAULT_TEXT_ALIGN: LeaderTextAlignment = "center";
const EDITING_TEXT_BACKGROUND_COLOR = "#2f2f2f";
const LEADER_TEXT_CLIP_EXTRA_PADDING = 4;
const TEXT_BORDER_PADDING_X = 8;
const TEXT_BORDER_PADDING_Y = 4;
const CREATE_LEADER_HANDLE_RADIUS = 7;
const CREATE_LEADER_HANDLE_GAP = 8;
const CREATE_LEADER_HANDLE_HIT_TOLERANCE = 4;
const EDIT_TEXT_HANDLE_WIDTH = 14;
const EDIT_TEXT_HANDLE_HEIGHT = 14;
const EDIT_TEXT_HANDLE_GAP = 8;
const EDIT_TEXT_HANDLE_HIT_TOLERANCE = 4;
const NO_TEXT_START_HANDLE_HIT_TOLERANCE = 4;
const LEADER_END_CONTROL_KEY_PREFIX = "leaderEnd-";
const LEADER_DELETE_CONTROL_KEY_PREFIX = "leaderDelete-";
const LEADER_DELETE_CONTROL_SIZE = 10;
const LEADER_DELETE_CONTROL_GAP = 4;
const HIDDEN_TRANSFORM_CONTROLS = {
  bl: false,
  br: false,
  mb: false,
  ml: false,
  mr: false,
  mt: false,
  mtr: false,
  tl: false,
  tr: false,
} as const;

function cloneEndpoint(endpoint: LeaderArrowEndpoint): LeaderArrowEndpoint {
  return { x: endpoint.x, y: endpoint.y };
}

function normalizeLeaderEndpoints(
  endpoints: LeaderArrowEndpoint[] | null | undefined,
) {
  if (!endpoints?.length) {
    return [] as LeaderArrowEndpoint[];
  }

  return endpoints
    .filter(
      (endpoint) =>
        Number.isFinite(endpoint?.x) && Number.isFinite(endpoint?.y),
    )
    .map((endpoint) => cloneEndpoint(endpoint));
}

function normalizeLeaderText(value: string | null | undefined) {
  const lines = (value ?? "").split(/\r?\n/).map((line) => line.trim());
  let startIndex = 0;
  let endIndex = lines.length;

  while (startIndex < endIndex && lines[startIndex].length === 0) {
    startIndex += 1;
  }
  while (endIndex > startIndex && lines[endIndex - 1].length === 0) {
    endIndex -= 1;
  }

  return lines.slice(startIndex, endIndex).join("\n");
}

function calculateLeaderStartOutsideTextBox(
  endpoint: Point,
  textBoxHalfWidth: number,
  textBoxHalfHeight: number,
  paddingX: number,
  paddingY: number,
) {
  const dx = endpoint.x;
  const dy = endpoint.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx < 0.0001 && absDy < 0.0001) {
    return new Point(0, 0);
  }

  const halfWidth = Math.max(0, textBoxHalfWidth + paddingX);
  const halfHeight = Math.max(0, textBoxHalfHeight + paddingY);
  const hitVerticalEdge = absDx * halfHeight >= absDy * halfWidth;
  const t = hitVerticalEdge
    ? halfWidth / Math.max(absDx, 0.0001)
    : halfHeight / Math.max(absDy, 0.0001);
  const clampedT = Math.min(1, Math.max(0, t));

  return new Point(dx * clampedT, dy * clampedT);
}

function distancePointToSegment(point: Point, start: Point, end: Point) {
  const segmentVector = end.subtract(start);
  const segmentLengthSquared =
    segmentVector.x * segmentVector.x + segmentVector.y * segmentVector.y;
  if (segmentLengthSquared < 0.0001) {
    return point.distanceFrom(start);
  }

  const pointVector = point.subtract(start);
  const projectionFactor = Math.min(
    1,
    Math.max(
      0,
      (pointVector.x * segmentVector.x + pointVector.y * segmentVector.y) /
        segmentLengthSquared,
    ),
  );
  const projectedPoint = start.add(
    segmentVector.scalarMultiply(projectionFactor),
  );
  return point.distanceFrom(projectedPoint);
}

function createLeaderEndControl(endpointIndex: number) {
  const control = new Control({
    actionName: `modifyLeaderEnd:${endpointIndex}`,
    cursorStyleHandler: function (_eventData, _control, fabricObject) {
      if (
        fabricObject instanceof LeaderTextWithArrow &&
        fabricObject.isLeaderHandleDragInProgress()
      ) {
        return "none";
      }
      return "crosshair";
    },
    mouseDownHandler: function (_eventData, transform) {
      if (!(transform.target instanceof LeaderTextWithArrow)) {
        return false;
      }

      transform.target.beginLeaderHandleDrag(endpointIndex);
      return true;
    },
    positionHandler: function (_dim, finalMatrix, fabricObject) {
      if (!(fabricObject instanceof LeaderTextWithArrow)) {
        return new Point(0, 0).transform(finalMatrix);
      }

      return fabricObject.getLeaderHandleCenterInViewportPlane(
        endpointIndex,
        this as Control,
      );
    },
    actionHandler: function (_eventData, transform, x, y) {
      if (!(transform.target instanceof LeaderTextWithArrow)) {
        return false;
      }

      const resolvedEndpoint = transform.target.resolveEndpointFromHandleCenter(
        endpointIndex,
        new Point(x, y),
        this as Control,
      );
      transform.target.updateLeaderHandleDrag(endpointIndex, resolvedEndpoint);
      transform.target.setCoords();
      transform.target.dirty = true;
      return true;
    },
    mouseUpHandler: function (_eventData, transform, x, y) {
      if (!(transform.target instanceof LeaderTextWithArrow)) {
        return false;
      }

      const resolvedEndpoint = transform.target.resolveEndpointFromHandleCenter(
        endpointIndex,
        new Point(x, y),
        this as Control,
      );
      transform.target.updateLeaderHandleDrag(endpointIndex, resolvedEndpoint);
      transform.target.commitLeaderHandleDrag(endpointIndex);
      return true;
    },
  });

  const defaultGetVisibility = control.getVisibility.bind(control);
  control.getVisibility = function (
    fabricObject: InteractiveFabricObject,
    controlKey: string,
  ) {
    if (
      fabricObject instanceof LeaderTextWithArrow &&
      fabricObject.isLeaderHandleDragInProgress()
    ) {
      return false;
    }

    return defaultGetVisibility(fabricObject, controlKey);
  };

  return control;
}

function createLeaderDeleteControl(endpointIndex: number) {
  const control = new Control({
    actionName: `deleteLeaderEnd:${endpointIndex}`,
    cursorStyle: "pointer",
    sizeX: LEADER_DELETE_CONTROL_SIZE,
    sizeY: LEADER_DELETE_CONTROL_SIZE,
    mouseDownHandler: function (_eventData, transform) {
      if (!(transform.target instanceof LeaderTextWithArrow)) {
        return false;
      }

      return transform.target.deleteLeaderArrowByIndex(endpointIndex);
    },
    positionHandler: function (_dim, _finalMatrix, fabricObject) {
      if (!(fabricObject instanceof LeaderTextWithArrow)) {
        return new Point(0, 0);
      }

      return fabricObject.getLeaderDeleteHandleCenterInViewportPlane(
        endpointIndex,
        this as Control,
      );
    },
    render: function (
      ctx: CanvasRenderingContext2D,
      left: number,
      top: number,
      _styleOverride,
      fabricObject,
    ) {
      if (!(fabricObject instanceof LeaderTextWithArrow)) {
        return;
      }

      const size = Math.max(this.sizeX ?? 0, this.sizeY ?? 0);
      const halfSize = size / 2;
      const glyphInset = size * 0.25;
      const strokeColor = fabricObject.getControlAccentColor();
      const lineWidth = Math.max(1, size * 0.12);

      ctx.save();
      ctx.translate(left, top);
      ctx.fillStyle = "white";
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "miter";
      ctx.lineCap = "square";
      ctx.beginPath();
      ctx.rect(-halfSize, -halfSize, size, size);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-halfSize + glyphInset, -halfSize + glyphInset);
      ctx.lineTo(halfSize - glyphInset, halfSize - glyphInset);
      ctx.moveTo(halfSize - glyphInset, -halfSize + glyphInset);
      ctx.lineTo(-halfSize + glyphInset, halfSize - glyphInset);
      ctx.stroke();
      ctx.restore();
    },
  });

  const defaultGetVisibility = control.getVisibility.bind(control);
  control.getVisibility = function (
    fabricObject: InteractiveFabricObject,
    controlKey: string,
  ) {
    if (!(fabricObject instanceof LeaderTextWithArrow)) {
      return defaultGetVisibility(fabricObject, controlKey);
    }

    return (
      fabricObject.isLeaderDeleteHandleVisible(endpointIndex) &&
      defaultGetVisibility(fabricObject, controlKey)
    );
  };

  return control;
}

/**
 * Fabric custom class that combines a text label and one or more leader arrows
 * with fixed start at text midpoint.
 */
export class LeaderTextWithArrow extends Group {
  /** Registered Fabric type name used by JSON deserialization. */
  static type = "leaderTextWithArrow" as const;
  /** Extra fields that should be included in Fabric JSON serialization. */
  static customProperties = [
    "text",
    "leaderEnd",
    "leaderEnds",
    "textFill",
    "leaderStroke",
    "leaderStrokeWidth",
    "fontSize",
    "fontFamily",
    "textAlign",
  ];

  /** Current label text content. */
  declare text: string;
  /** Legacy single leader endpoint alias (maps to first item in `leaderEnds`). */
  declare leaderEnd: LeaderArrowEndpoint | null;
  /** Current leader endpoints in absolute canvas coordinates. */
  declare leaderEnds: LeaderArrowEndpoint[];
  /** Current label fill color. */
  declare textFill: string;
  /** Current leader stroke color. */
  declare leaderStroke: string;
  /** Current leader stroke width. */
  declare leaderStrokeWidth: number;
  /** Current label font size. */
  declare fontSize: number;
  /** Current label font family. */
  declare fontFamily: string;
  /** Current label text alignment. */
  declare textAlign: LeaderTextAlignment;

  private readonly textObject: FabricText;
  private readonly baseControls: Record<string, Control>;
  private editingTextObject: IText | null = null;
  private disposeEditingListeners: (() => void) | null = null;
  private isDraggingLeaderHandle = false;
  private draggingLeaderHandleIndex: number | null = null;
  private isLeaderDeletionHoverActive = false;
  private leaderDeletionHoverScenePoint: Point | null = null;
  private isHoveringTextBox = false;
  private isPlacingLeaderEndpoint = false;
  private pendingLeaderEndpoint: Point | null = null;

  constructor(options: LeaderTextWithArrowOptions = {}) {
    const defaultAbsoluteEndpoint = {
      x: (options.left ?? 0) + 110,
      y: (options.top ?? 0) - 60,
    };
    const text = normalizeLeaderText(options.text ?? DEFAULT_TEXT);
    const textFill = options.textFill ?? DEFAULT_TEXT_FILL;
    const leaderStroke = options.leaderStroke ?? DEFAULT_LEADER_STROKE;
    const leaderStrokeWidth =
      options.leaderStrokeWidth ?? DEFAULT_LEADER_STROKE_WIDTH;
    const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
    const fontFamily = options.fontFamily ?? DEFAULT_FONT_FAMILY;
    const textAlign = options.textAlign ?? DEFAULT_TEXT_ALIGN;

    const textObject = new FabricText(text, {
      left: 0,
      top: 0,
      originX: "center",
      originY: "center",
      fill: textFill,
      fontSize,
      fontFamily,
      textAlign,
      selectable: false,
      evented: false,
      strokeUniform: true,
    });

    super([textObject], {
      left: options.left,
      top: options.top,
      angle: options.angle,
      subTargetCheck: false,
      interactive: false,
      objectCaching: false,
    });

    const hasExplicitLeaderEnds = Array.isArray(options.leaderEnds);
    const hasExplicitLeaderEnd = options.leaderEnd !== undefined;
    const initialLeaderEnds = hasExplicitLeaderEnds
      ? normalizeLeaderEndpoints(options.leaderEnds)
      : hasExplicitLeaderEnd
        ? options.leaderEnd
          ? [cloneEndpoint(options.leaderEnd)]
          : []
        : [cloneEndpoint(defaultAbsoluteEndpoint)];

    this.textObject = textObject;
    this.text = text;
    this.leaderEnds = initialLeaderEnds;
    this.leaderEnd = this.leaderEnds[0] ?? null;
    this.textFill = textFill;
    this.leaderStroke = leaderStroke;
    this.leaderStrokeWidth = leaderStrokeWidth;
    this.fontSize = fontSize;
    this.fontFamily = fontFamily;
    this.textAlign = textAlign;
    this.baseControls = { ...this.controls };
    this.setControlsVisibility(HIDDEN_TRANSFORM_CONTROLS);
    this.hasBorders = false;

    this.refreshVisuals();
  }

  /** Update text content while keeping leader starts anchored to text midpoint. */
  setTextContent(nextText: string) {
    this.text = normalizeLeaderText(nextText);
    this.isLeaderDeletionHoverActive = false;
    this.leaderDeletionHoverScenePoint = null;
    this.refreshVisuals();
  }

  /** Backward-compatible setter for a single leader endpoint. */
  setLeaderEnd(nextEndpoint: LeaderArrowEndpoint | null) {
    this.setLeaderEnds(nextEndpoint ? [nextEndpoint] : []);
  }

  /** Set full endpoint list for all leader arrows. */
  setLeaderEnds(nextEndpoints: LeaderArrowEndpoint[]) {
    this.leaderEnds = normalizeLeaderEndpoints(nextEndpoints);
    this.syncLegacyLeaderEnd();
    this.refreshVisuals();
  }

  /** Mark start of one endpoint handle drag for delete-hover rendering. */
  beginLeaderHandleDrag(endpointIndex: number) {
    if (!this.isValidLeaderIndex(endpointIndex)) {
      return;
    }

    this.isDraggingLeaderHandle = true;
    this.draggingLeaderHandleIndex = endpointIndex;
    this.isLeaderDeletionHoverActive = false;
    this.leaderDeletionHoverScenePoint = null;
    this.refreshVisuals();
    this.dirty = true;
  }

  /** Update dragged endpoint and whether it currently hovers the text delete target. */
  updateLeaderHandleDrag(
    endpointIndex: number,
    nextEndpoint: LeaderArrowEndpoint,
  ) {
    if (
      !this.isValidLeaderIndex(endpointIndex) ||
      this.draggingLeaderHandleIndex !== endpointIndex
    ) {
      return;
    }

    const nextLeaderEnds = [...this.leaderEnds];
    nextLeaderEnds[endpointIndex] = cloneEndpoint(nextEndpoint);
    this.leaderEnds = nextLeaderEnds;
    this.syncLegacyLeaderEnd();
    this.refreshVisuals();
    this.isLeaderDeletionHoverActive =
      this.canDeleteLeaderArrow(endpointIndex) &&
      this.isScenePointInsideTextBounds(nextEndpoint);
    this.leaderDeletionHoverScenePoint = this.isLeaderDeletionHoverActive
      ? new Point(nextEndpoint.x, nextEndpoint.y)
      : null;
    this.dirty = true;
  }

  /** Finalize drag and delete that arrow when dropped onto text, if not the last arrow. */
  commitLeaderHandleDrag(endpointIndex: number) {
    if (
      this.isDraggingLeaderHandle &&
      this.draggingLeaderHandleIndex === endpointIndex &&
      this.isLeaderDeletionHoverActive
    ) {
      const nextLeaderEnds = [...this.leaderEnds];
      nextLeaderEnds.splice(endpointIndex, 1);
      this.leaderEnds = nextLeaderEnds;
      this.syncLegacyLeaderEnd();
    }

    this.isDraggingLeaderHandle = false;
    this.draggingLeaderHandleIndex = null;
    this.isLeaderDeletionHoverActive = false;
    this.leaderDeletionHoverScenePoint = null;
    this.refreshVisuals();
    this.setCoords();
    this.dirty = true;
    this.canvas?.requestRenderAll();
  }

  /** Update label font size. */
  setFontSize(nextFontSize: number) {
    this.fontSize = nextFontSize;
    this.refreshVisuals();
  }

  /** Update label text alignment. */
  setTextAlign(nextTextAlign: LeaderTextAlignment) {
    this.textAlign = nextTextAlign;
    this.refreshVisuals();
  }

  /** Scale custom internal geometry directly (for scale-to-geometry baking). */
  scaleInternalGeometry(scaleX: number, scaleY: number) {
    const uniformScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
    this.setFontSize(Math.max(1, this.fontSize * uniformScale));
  }

  /** Recompute arrow geometry using current text position and absolute endpoints. */
  syncLeaderToAbsoluteEndpoint() {
    this.refreshVisuals();
  }

  /** Recompute selection-dependent visuals (placeholder text + border). */
  syncSelectionVisuals() {
    this.refreshVisuals();
  }

  /** Update hover state for showing the create-arrow handle above text. */
  setTextBoxHoverState(isHovered: boolean) {
    const nextHoverState = this.hasTextContent() ? isHovered : false;
    if (this.isHoveringTextBox === nextHoverState) {
      return false;
    }

    this.isHoveringTextBox = nextHoverState;
    this.dirty = true;
    return true;
  }

  /** Returns true when scene-space point is inside the leader text box. */
  isPointOnTextBox(pointOnScenePlane: Point) {
    return this.isScenePointInsideTextBounds(pointOnScenePlane);
  }

  /** Returns true when scene-space point is over the create-arrow handle. */
  isPointOnCreateLeaderHandle(pointOnScenePlane: Point, requireVisible = true) {
    if (this.isPlacingLeaderEndpoint) {
      return false;
    }

    if (requireVisible && !this.isCreateLeaderHandleVisible()) {
      return false;
    }

    const handleCenter = this.getCreateLeaderHandleCenterInScenePlane();
    const hitRadius =
      (CREATE_LEADER_HANDLE_RADIUS + CREATE_LEADER_HANDLE_HIT_TOLERANCE) /
      this.getViewportScale();
    return pointOnScenePlane.distanceFrom(handleCenter) <= hitRadius;
  }

  /** Returns true when scene-space point is over the empty-text edit handle. */
  isPointOnEditTextHandle(pointOnScenePlane: Point, requireVisible = true) {
    if (requireVisible && !this.isEditTextHandleVisible()) {
      return false;
    }

    const pointOnObjectPlane = util.sendPointToPlane(
      pointOnScenePlane,
      undefined,
      this.calcTransformMatrix(),
    );
    const handleGeometry = this.getEditTextHandleGeometryOnObjectPlane();
    const hitTolerance =
      EDIT_TEXT_HANDLE_HIT_TOLERANCE / this.getViewportScale();
    const halfWidth = handleGeometry.width / 2;
    const halfHeight = handleGeometry.height / 2;

    return (
      pointOnObjectPlane.x >=
        handleGeometry.center.x - halfWidth - hitTolerance &&
      pointOnObjectPlane.x <=
        handleGeometry.center.x + halfWidth + hitTolerance &&
      pointOnObjectPlane.y >=
        handleGeometry.center.y - halfHeight - hitTolerance &&
      pointOnObjectPlane.y <=
        handleGeometry.center.y + halfHeight + hitTolerance
    );
  }

  /** Returns true when scene-space point is over the empty-text start square handle. */
  isPointOnNoTextStartHandle(pointOnScenePlane: Point) {
    if (!this.isNoTextStartHandleVisible()) {
      return false;
    }

    const pointOnObjectPlane = util.sendPointToPlane(
      pointOnScenePlane,
      undefined,
      this.calcTransformMatrix(),
    );
    const handleCenter = this.getNoTextStartHandleCenterOnObjectPlane();
    const halfSize = this.getNoTextStartHandleSizeOnObjectPlane() / 2;
    const hitTolerance =
      NO_TEXT_START_HANDLE_HIT_TOLERANCE / this.getViewportScale();

    return (
      pointOnObjectPlane.x >= handleCenter.x - halfSize - hitTolerance &&
      pointOnObjectPlane.x <= handleCenter.x + halfSize + hitTolerance &&
      pointOnObjectPlane.y >= handleCenter.y - halfSize - hitTolerance &&
      pointOnObjectPlane.y <= handleCenter.y + halfSize + hitTolerance
    );
  }

  /** Enter endpoint-placement mode for creating one additional leader arrow. */
  beginLeaderEndpointPlacement(startPointOnScenePlane: Point) {
    this.isPlacingLeaderEndpoint = true;
    this.isHoveringTextBox = false;
    this.pendingLeaderEndpoint = startPointOnScenePlane.clone();
    this.dirty = true;
    this.canvas?.requestRenderAll();
  }

  /** Update temporary endpoint while user is placing a new leader endpoint. */
  updateLeaderEndpointPlacement(nextPointOnScenePlane: Point) {
    if (!this.isPlacingLeaderEndpoint) {
      return;
    }

    this.pendingLeaderEndpoint = nextPointOnScenePlane.clone();
    this.dirty = true;
  }

  /** Finalize endpoint placement and add the new leader arrow. */
  commitLeaderEndpointPlacement(finalPointOnScenePlane: Point) {
    if (!this.isPlacingLeaderEndpoint) {
      return;
    }

    this.isPlacingLeaderEndpoint = false;
    this.pendingLeaderEndpoint = null;

    const nextLeaderEnds = [
      ...this.leaderEnds,
      {
        x: finalPointOnScenePlane.x,
        y: finalPointOnScenePlane.y,
      },
    ];
    this.leaderEnds = normalizeLeaderEndpoints(nextLeaderEnds);
    this.syncLegacyLeaderEnd();
    this.refreshVisuals();

    this.setCoords();
    this.dirty = true;
  }

  /** Start inline text editing for the leader label. */
  startTextEditing() {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }

    if (this.editingTextObject) {
      if (!this.editingTextObject.isEditing) {
        this.editingTextObject.enterEditing();
      }
      this.editingTextObject.selectAll();
      canvas.setActiveObject(this.editingTextObject);
      canvas.requestRenderAll();
      return;
    }

    const textCenterOnScenePlane = util.sendPointToPlane(
      new Point(0, 0),
      this.calcTransformMatrix(),
      undefined,
    );
    const editingText = new IText(this.text, {
      left: textCenterOnScenePlane.x,
      top: textCenterOnScenePlane.y,
      originX: "center",
      originY: "center",
      angle: this.getTotalAngle(),
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      textAlign: this.textAlign,
      fill: this.textFill,
      backgroundColor: EDITING_TEXT_BACKGROUND_COLOR,
      editable: true,
      hasControls: false,
      hasBorders: true,
      borderColor: this.getSelectionBorderColor(),
      borderScaleFactor: this.borderScaleFactor,
      padding: TEXT_BORDER_PADDING_Y,
      lockMovementX: true,
      lockMovementY: true,
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
      hoverCursor: "text",
      strokeUniform: true,
    });

    const finishEditing = (applyChanges: boolean) => {
      const currentEditor = this.editingTextObject;
      if (!currentEditor) {
        return;
      }

      if (this.disposeEditingListeners) {
        this.disposeEditingListeners();
        this.disposeEditingListeners = null;
      }

      this.editingTextObject = null;
      if (applyChanges) {
        this.setTextContent(currentEditor.text ?? "");
      }

      this.textObject.set({ visible: true });
      currentEditor.canvas?.discardActiveObject();
      currentEditor.canvas?.remove(currentEditor);
      this.setCoords();
      this.dirty = true;
      canvas.requestRenderAll();
    };

    const handleEditingExited = () => {
      finishEditing(true);
    };

    editingText.on("editing:exited", handleEditingExited);
    this.disposeEditingListeners = () => {
      editingText.off("editing:exited", handleEditingExited);
    };
    this.editingTextObject = editingText;

    this.textObject.set({ visible: false });
    this.dirty = true;
    canvas.add(editingText);
    canvas.setActiveObject(editingText);
    editingText.enterEditing();
    editingText.selectAll();
    canvas.requestRenderAll();
  }

  /** Compute leader handle center in viewport space so its edge touches arrow head. */
  getLeaderHandleCenterInViewportPlane(
    endpointIndex: number,
    control?: Control,
  ) {
    const geometry = this.getLeaderGeometryInObjectPlaneForIndex(endpointIndex);
    const sceneToViewportMatrix = this.getViewportTransform();
    if (!geometry) {
      return new Point(0, 0)
        .transform(this.calcTransformMatrix())
        .transform(sceneToViewportMatrix);
    }

    const { endpoint, visibleLeaderStart } = geometry;
    const objectToSceneMatrix = this.calcTransformMatrix();
    const endpointOnScenePlane = endpoint.transform(objectToSceneMatrix);
    const directionOnScenePlane = endpoint
      .subtract(visibleLeaderStart)
      .transform(objectToSceneMatrix, true);
    const directionLength = Math.hypot(
      directionOnScenePlane.x,
      directionOnScenePlane.y,
    );
    const normalizedDirection =
      directionLength > 0.0001
        ? directionOnScenePlane.scalarDivide(directionLength)
        : new Point(1, 0);
    const handleHalfSizeOnScenePlane =
      this.getControlSize(control) / (2 * this.getViewportScale());
    const handleCenterOnScenePlane = endpointOnScenePlane.add(
      normalizedDirection.scalarMultiply(handleHalfSizeOnScenePlane),
    );

    return handleCenterOnScenePlane.transform(sceneToViewportMatrix);
  }

  /** Compute delete-handle center in viewport space next to endpoint handle. */
  getLeaderDeleteHandleCenterInViewportPlane(
    endpointIndex: number,
    control?: Control,
  ) {
    const endpointHandleCenter =
      this.getLeaderHandleCenterInViewportPlane(endpointIndex);
    const endpointHandleSize = this.getControlSize();
    const deleteHandleSize = this.getControlSize(control);
    const offsetX =
      (endpointHandleSize + deleteHandleSize) / 2 + LEADER_DELETE_CONTROL_GAP;
    return endpointHandleCenter.add(new Point(offsetX, 0));
  }

  /** Resolve absolute endpoint from dragged handle center in scene coordinates. */
  resolveEndpointFromHandleCenter(
    endpointIndex: number,
    handleCenterOnScenePlane: Point,
    control?: Control,
  ): LeaderArrowEndpoint {
    if (!this.isValidLeaderIndex(endpointIndex)) {
      return {
        x: handleCenterOnScenePlane.x,
        y: handleCenterOnScenePlane.y,
      };
    }

    const handleHalfSizeOnScenePlane =
      this.getControlSize(control) / (2 * this.getViewportScale());
    let endpointOnScenePlane = handleCenterOnScenePlane.clone();

    for (let iteration = 0; iteration < 2; iteration += 1) {
      const endpointOnObjectPlane = util.sendPointToPlane(
        endpointOnScenePlane,
        undefined,
        this.calcTransformMatrix(),
      );
      const geometry = this.getLeaderGeometryFromObjectEndpoint(
        endpointOnObjectPlane,
      );
      const startOnScenePlane = geometry.visibleLeaderStart.transform(
        this.calcTransformMatrix(),
      );
      const directionOnScenePlane =
        endpointOnScenePlane.subtract(startOnScenePlane);
      const directionLength = Math.hypot(
        directionOnScenePlane.x,
        directionOnScenePlane.y,
      );
      const normalizedDirection =
        directionLength > 0.0001
          ? directionOnScenePlane.scalarDivide(directionLength)
          : new Point(1, 0);

      endpointOnScenePlane = handleCenterOnScenePlane.subtract(
        normalizedDirection.scalarMultiply(handleHalfSizeOnScenePlane),
      );
    }

    return {
      x: endpointOnScenePlane.x,
      y: endpointOnScenePlane.y,
    };
  }

  /** Returns true when a scene-space point hits any visible leader arrow line/head. */
  isPointOnLeaderArrow(pointOnScenePlane: Point) {
    return this.isPointNearLeaderLine(pointOnScenePlane);
  }

  /** Returns whether endpoint-handle drag interaction is currently active. */
  isLeaderHandleDragInProgress() {
    return this.isDraggingLeaderHandle;
  }

  /** Returns control accent color used for custom handle rendering. */
  getControlAccentColor() {
    return this.getSelectionBorderColor();
  }

  /** Returns true when endpoint delete control should be visible. */
  isLeaderDeleteHandleVisible(endpointIndex: number) {
    return (
      this.isSelectedOnCanvas() &&
      this.canDeleteLeaderArrow(endpointIndex) &&
      !this.isPlacingLeaderEndpoint &&
      !this.editingTextObject &&
      !this.isLeaderHandleDragInProgress()
    );
  }

  /** Delete one leader arrow endpoint if allowed. */
  deleteLeaderArrowByIndex(endpointIndex: number) {
    if (!this.canDeleteLeaderArrow(endpointIndex)) {
      return false;
    }

    const nextLeaderEnds = [...this.leaderEnds];
    nextLeaderEnds.splice(endpointIndex, 1);
    this.leaderEnds = nextLeaderEnds;
    this.syncLegacyLeaderEnd();
    this.refreshVisuals();
    this.setCoords();
    this.dirty = true;
    this.canvas?.setActiveObject(this);
    this.canvas?.requestRenderAll();
    return true;
  }

  containsPoint(point: Point) {
    return (
      super.containsPoint(point) ||
      this.isPointNearLeaderLine(point) ||
      this.isPointOnCreateLeaderHandle(point) ||
      this.isPointOnEditTextHandle(point) ||
      this.isPointOnNoTextStartHandle(point)
    );
  }

  drawObject(
    ctx: CanvasRenderingContext2D,
    forClipping: boolean | undefined,
    context: unknown,
  ) {
    super.drawObject(
      ctx,
      forClipping,
      context as Parameters<Group["drawObject"]>[2],
    );

    if (forClipping) {
      return;
    }

    const endpointsToRender = this.getRenderEndpointsInObjectPlane();
    ctx.save();

    for (const endpoint of endpointsToRender) {
      const { endpoint: leaderEnd, visibleLeaderStart } =
        this.getLeaderGeometryFromObjectEndpoint(endpoint);
      const deltaX = leaderEnd.x - visibleLeaderStart.x;
      const deltaY = leaderEnd.y - visibleLeaderStart.y;
      const angle = Math.atan2(deltaY, deltaX);
      const headLength = 12;
      const leftHeadX =
        leaderEnd.x - headLength * Math.cos(angle - Math.PI / 6);
      const leftHeadY =
        leaderEnd.y - headLength * Math.sin(angle - Math.PI / 6);
      const rightHeadX =
        leaderEnd.x - headLength * Math.cos(angle + Math.PI / 6);
      const rightHeadY =
        leaderEnd.y - headLength * Math.sin(angle + Math.PI / 6);

      ctx.strokeStyle = this.leaderStroke;
      ctx.lineWidth = this.leaderStrokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(visibleLeaderStart.x, visibleLeaderStart.y);
      ctx.lineTo(leaderEnd.x, leaderEnd.y);
      ctx.moveTo(leftHeadX, leftHeadY);
      ctx.lineTo(leaderEnd.x, leaderEnd.y);
      ctx.lineTo(rightHeadX, rightHeadY);
      ctx.stroke();
    }

    if (this.shouldShowTextBorder()) {
      const textWidth = Math.max(1, this.textObject.getScaledWidth());
      const textHeight = Math.max(1, this.textObject.getScaledHeight());
      const borderLineWidth = 1 / this.getViewportScale();

      ctx.strokeStyle = this.getSelectionBorderColor();
      ctx.lineWidth = borderLineWidth;
      ctx.strokeRect(
        -textWidth / 2 - TEXT_BORDER_PADDING_X,
        -textHeight / 2 - TEXT_BORDER_PADDING_Y,
        textWidth + TEXT_BORDER_PADDING_X * 2,
        textHeight + TEXT_BORDER_PADDING_Y * 2,
      );
    }

    if (this.isCreateLeaderHandleVisible()) {
      if (this.isNoTextStartHandleVisible()) {
        this.drawNoTextStartHandle(ctx);
      }
      this.drawCreateLeaderHandle(ctx);
    }
    if (this.isEditTextHandleVisible()) {
      this.drawEditTextHandle(ctx);
    }

    if (
      this.isDraggingLeaderHandle &&
      this.isLeaderDeletionHoverActive &&
      this.leaderDeletionHoverScenePoint
    ) {
      this.drawDeleteIndicator(ctx, this.leaderDeletionHoverScenePoint);
    }

    ctx.restore();
  }

  /** Deserialize one custom text + leader arrow element from JSON. */
  static fromObject<T extends TOptions<SerializedGroupProps>>(
    { type, objects, layoutManager, ...options }: T,
    _abortable?: Abortable,
  ): Promise<Group> {
    const object = options as unknown as SerializedLeaderTextWithArrow;
    return Promise.resolve(
      new LeaderTextWithArrow({
        left: object.left,
        top: object.top,
        angle: object.angle,
        text: object.text,
        leaderEnd: object.leaderEnd ?? null,
        leaderEnds: object.leaderEnds,
        textFill: object.textFill,
        leaderStroke: object.leaderStroke,
        leaderStrokeWidth: object.leaderStrokeWidth,
        fontSize: object.fontSize,
        fontFamily: object.fontFamily,
        textAlign: object.textAlign ?? DEFAULT_TEXT_ALIGN,
      }),
    );
  }

  private hasTextContent() {
    return this.getNormalizedText().length > 0;
  }

  private syncLegacyLeaderEnd() {
    this.leaderEnd = this.leaderEnds[0] ?? null;
  }

  private isValidLeaderIndex(endpointIndex: number) {
    return endpointIndex >= 0 && endpointIndex < this.leaderEnds.length;
  }

  private getLeaderGeometryFromObjectEndpoint(endpoint: Point) {
    if (!this.hasTextContent()) {
      return {
        endpoint,
        visibleLeaderStart: new Point(0, 0),
      };
    }

    const textBoxHalfWidth = this.textObject.getScaledWidth() / 2;
    const textBoxHalfHeight = this.textObject.getScaledHeight() / 2;
    const baseLeaderClipPadding =
      this.leaderStrokeWidth * 0.75 + LEADER_TEXT_CLIP_EXTRA_PADDING;
    const leaderClipPaddingX =
      baseLeaderClipPadding + (TEXT_BORDER_PADDING_X - TEXT_BORDER_PADDING_Y);
    const leaderClipPaddingY = baseLeaderClipPadding;
    const visibleLeaderStart = calculateLeaderStartOutsideTextBox(
      endpoint,
      textBoxHalfWidth,
      textBoxHalfHeight,
      leaderClipPaddingX,
      leaderClipPaddingY,
    );

    return {
      endpoint,
      visibleLeaderStart,
    };
  }

  private getLeaderGeometryInObjectPlaneForIndex(endpointIndex: number) {
    if (!this.isValidLeaderIndex(endpointIndex)) {
      return null;
    }

    const endpoint = this.leaderEnds[endpointIndex];
    const endpointOnObjectPlane = util.sendPointToPlane(
      new Point(endpoint.x, endpoint.y),
      undefined,
      this.calcTransformMatrix(),
    );
    return this.getLeaderGeometryFromObjectEndpoint(endpointOnObjectPlane);
  }

  private getRenderEndpointsInObjectPlane() {
    const renderEndpoints: Point[] = [];
    for (const endpoint of this.leaderEnds) {
      renderEndpoints.push(
        util.sendPointToPlane(
          new Point(endpoint.x, endpoint.y),
          undefined,
          this.calcTransformMatrix(),
        ),
      );
    }
    if (this.pendingLeaderEndpoint) {
      renderEndpoints.push(
        util.sendPointToPlane(
          this.pendingLeaderEndpoint,
          undefined,
          this.calcTransformMatrix(),
        ),
      );
    }
    return renderEndpoints;
  }

  private getViewportScale() {
    const viewportTransform = this.getViewportTransform();
    const scaleX = Math.abs(viewportTransform[0]) || 1;
    const scaleY = Math.abs(viewportTransform[3]) || 1;
    return (scaleX + scaleY) / 2;
  }

  private getControlSize(control?: Control) {
    const controlSize = Math.max(control?.sizeX ?? 0, control?.sizeY ?? 0);
    return controlSize > 0 ? controlSize : this.cornerSize;
  }

  private getDisplayText() {
    return this.getNormalizedText();
  }

  private shouldShowTextBorder() {
    return this.isSelectedOnCanvas() && this.hasTextContent();
  }

  private isSelectedOnCanvas() {
    return this.canvas?.getActiveObject() === this;
  }

  private getSelectionBorderColor() {
    if (typeof this.cornerStrokeColor === "string") {
      return this.cornerStrokeColor;
    }
    if (typeof this.borderColor === "string") {
      return this.borderColor;
    }
    return "#253ed3";
  }

  private canDeleteLeaderArrow(endpointIndex: number) {
    return (
      this.isValidLeaderIndex(endpointIndex) &&
      (this.leaderEnds.length > 1 || this.hasTextContent())
    );
  }

  private getNormalizedText() {
    return normalizeLeaderText(this.text);
  }

  private shouldDeleteIfEmpty() {
    return this.leaderEnds.length === 0 && !this.hasTextContent();
  }

  private removeFromCanvasIfEmpty() {
    if (!this.shouldDeleteIfEmpty()) {
      return false;
    }

    const canvas = this.canvas;
    if (!canvas) {
      return false;
    }

    if (canvas.getActiveObject() === this) {
      canvas.discardActiveObject();
    }

    canvas.remove(this);
    this.dirty = true;
    canvas.requestRenderAll();
    return true;
  }

  private isCreateLeaderHandleVisible() {
    if (
      this.isPlacingLeaderEndpoint ||
      this.editingTextObject ||
      this.isLeaderHandleDragInProgress()
    ) {
      return false;
    }

    return this.isSelectedOnCanvas();
  }

  private isEditTextHandleVisible() {
    return (
      this.isSelectedOnCanvas() &&
      !this.hasTextContent() &&
      !this.isPlacingLeaderEndpoint &&
      !this.editingTextObject &&
      !this.isLeaderHandleDragInProgress()
    );
  }

  private isNoTextStartHandleVisible() {
    return (
      this.isSelectedOnCanvas() &&
      !this.hasTextContent() &&
      !this.isPlacingLeaderEndpoint &&
      !this.editingTextObject &&
      !this.isLeaderHandleDragInProgress()
    );
  }

  private getNoTextStartHandleCenterOnObjectPlane() {
    return new Point(0, 0);
  }

  private getNoTextStartHandleSizeOnObjectPlane() {
    return this.getControlSize() / this.getViewportScale();
  }

  private getCreateLeaderHandleCenterOnObjectPlane() {
    if (!this.hasTextContent()) {
      const viewportScale = this.getViewportScale();
      const startHandleHalfSize =
        this.getNoTextStartHandleSizeOnObjectPlane() / 2;
      const handleRadius = CREATE_LEADER_HANDLE_RADIUS / viewportScale;
      const handleGap = CREATE_LEADER_HANDLE_GAP / viewportScale;
      return new Point(startHandleHalfSize + handleGap + handleRadius, 0);
    }

    const textHalfHeight = this.hasTextContent()
      ? Math.max(1, this.textObject.getScaledHeight()) / 2
      : 0;
    const borderPaddingY = this.hasTextContent() ? TEXT_BORDER_PADDING_Y : 0;
    const offset =
      textHalfHeight +
      borderPaddingY +
      CREATE_LEADER_HANDLE_GAP +
      CREATE_LEADER_HANDLE_RADIUS;
    return new Point(0, -offset);
  }

  private getEditTextHandleGeometryOnObjectPlane() {
    const viewportScale = this.getViewportScale();
    const width = EDIT_TEXT_HANDLE_WIDTH / viewportScale;
    const height = EDIT_TEXT_HANDLE_HEIGHT / viewportScale;
    const createHandleCenter = this.getCreateLeaderHandleCenterOnObjectPlane();
    const createHandleRadius = CREATE_LEADER_HANDLE_RADIUS / viewportScale;
    const handleGap = EDIT_TEXT_HANDLE_GAP / viewportScale;
    const centerX =
      createHandleCenter.x + createHandleRadius + handleGap + width / 2;

    return {
      center: new Point(centerX, createHandleCenter.y),
      width,
      height,
    };
  }

  private getCreateLeaderHandleCenterInScenePlane() {
    return this.getCreateLeaderHandleCenterOnObjectPlane().transform(
      this.calcTransformMatrix(),
    );
  }

  private isScenePointInsideTextBounds(
    scenePoint: LeaderArrowEndpoint | Point,
  ) {
    if (!this.hasTextContent()) {
      return false;
    }

    const pointOnScenePlane =
      scenePoint instanceof Point
        ? scenePoint
        : new Point(scenePoint.x, scenePoint.y);
    const pointOnObjectPlane = util.sendPointToPlane(
      pointOnScenePlane,
      undefined,
      this.calcTransformMatrix(),
    );
    const textBoxHalfWidth = this.textObject.getScaledWidth() / 2;
    const textBoxHalfHeight = this.textObject.getScaledHeight() / 2;
    return (
      pointOnObjectPlane.x >= -textBoxHalfWidth - TEXT_BORDER_PADDING_X &&
      pointOnObjectPlane.x <= textBoxHalfWidth + TEXT_BORDER_PADDING_X &&
      pointOnObjectPlane.y >= -textBoxHalfHeight - TEXT_BORDER_PADDING_Y &&
      pointOnObjectPlane.y <= textBoxHalfHeight + TEXT_BORDER_PADDING_Y
    );
  }

  private drawDeleteIndicator(
    ctx: CanvasRenderingContext2D,
    anchorOnScenePlane: Point,
  ) {
    const viewportScale = this.getViewportScale();
    const iconSize = 14 / viewportScale;
    const iconHalfSize = iconSize / 2;
    const iconOffsetOnScenePlane = new Point(
      (iconHalfSize + 10 / viewportScale) * 1,
      (-iconHalfSize - 10 / viewportScale) * 1,
    );
    const iconCenterOnObjectPlane = util.sendPointToPlane(
      anchorOnScenePlane.add(iconOffsetOnScenePlane),
      undefined,
      this.calcTransformMatrix(),
    );
    const borderWidth = 1 / viewportScale;
    const glyphWidth = iconSize * 0.52;
    const glyphHeight = iconSize * 0.5;

    ctx.save();
    ctx.translate(iconCenterOnObjectPlane.x, iconCenterOnObjectPlane.y);
    ctx.fillStyle = "white";
    ctx.strokeStyle = this.getSelectionBorderColor();
    ctx.lineWidth = borderWidth;
    ctx.lineJoin = "miter";
    ctx.lineCap = "square";
    ctx.beginPath();
    ctx.rect(-iconHalfSize, -iconHalfSize, iconSize, iconSize);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(
      -glyphWidth / 2,
      -glyphHeight / 2 + iconSize * 0.08,
      glyphWidth,
      glyphHeight,
    );
    ctx.stroke();

    const lidWidth = glyphWidth * 0.9;
    const lidY = -glyphHeight / 2 - iconSize * 0.07;
    ctx.beginPath();
    ctx.moveTo(-lidWidth / 2, lidY);
    ctx.lineTo(lidWidth / 2, lidY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, lidY - iconSize * 0.08);
    ctx.lineTo(0, lidY);
    ctx.stroke();
    ctx.restore();
  }

  private drawCreateLeaderHandle(ctx: CanvasRenderingContext2D) {
    const viewportScale = this.getViewportScale();
    const handleCenter = this.getCreateLeaderHandleCenterOnObjectPlane();
    const handleRadius = CREATE_LEADER_HANDLE_RADIUS / viewportScale;
    const lineWidth = 1 / viewportScale;
    const plusSize = handleRadius * 1.1;

    ctx.save();
    ctx.fillStyle = "white";
    ctx.strokeStyle = this.getSelectionBorderColor();
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(handleCenter.x, handleCenter.y, handleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(handleCenter.x - plusSize / 2, handleCenter.y);
    ctx.lineTo(handleCenter.x + plusSize / 2, handleCenter.y);
    ctx.moveTo(handleCenter.x, handleCenter.y - plusSize / 2);
    ctx.lineTo(handleCenter.x, handleCenter.y + plusSize / 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawNoTextStartHandle(ctx: CanvasRenderingContext2D) {
    const viewportScale = this.getViewportScale();
    const lineWidth = 1 / viewportScale;
    const handleCenter = this.getNoTextStartHandleCenterOnObjectPlane();
    const handleSize = this.getNoTextStartHandleSizeOnObjectPlane();
    const handleHalfSize = handleSize / 2;

    ctx.save();
    ctx.fillStyle = "white";
    ctx.strokeStyle = this.getSelectionBorderColor();
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "miter";
    ctx.lineCap = "square";
    ctx.beginPath();
    ctx.rect(
      handleCenter.x - handleHalfSize,
      handleCenter.y - handleHalfSize,
      handleSize,
      handleSize,
    );
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawEditTextHandle(ctx: CanvasRenderingContext2D) {
    const viewportScale = this.getViewportScale();
    const lineWidth = 1 / viewportScale;
    const handleGeometry = this.getEditTextHandleGeometryOnObjectPlane();
    const halfWidth = handleGeometry.width / 2;
    const halfHeight = handleGeometry.height / 2;
    const tWidth = handleGeometry.width * 0.64;
    const tTopY = handleGeometry.center.y - handleGeometry.height * 0.28;
    const tTopBarHeight = Math.max(
      lineWidth * 1.5,
      handleGeometry.height * 0.13,
    );
    const tStemWidth = Math.max(lineWidth * 1.5, handleGeometry.width * 0.14);
    const tSerifDrop = handleGeometry.height * 0.16;
    const tStemBottom = handleGeometry.center.y + handleGeometry.height * 0.32;

    ctx.save();
    ctx.strokeStyle = this.getSelectionBorderColor();
    ctx.fillStyle = "white";
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "miter";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.rect(
      handleGeometry.center.x - halfWidth,
      handleGeometry.center.y - halfHeight,
      handleGeometry.width,
      handleGeometry.height,
    );
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.getSelectionBorderColor();
    ctx.fillRect(
      handleGeometry.center.x - tWidth / 2,
      tTopY,
      tWidth,
      tTopBarHeight,
    );
    ctx.fillRect(
      handleGeometry.center.x - tWidth / 2,
      tTopY,
      tTopBarHeight,
      tSerifDrop,
    );
    ctx.fillRect(
      handleGeometry.center.x + tWidth / 2 - tTopBarHeight,
      tTopY,
      tTopBarHeight,
      tSerifDrop,
    );
    ctx.fillRect(
      handleGeometry.center.x - tStemWidth / 2,
      tTopY + tTopBarHeight,
      tStemWidth,
      tStemBottom - (tTopY + tTopBarHeight),
    );
    ctx.restore();
  }

  private isPointNearLeaderLine(pointOnScenePlane: Point) {
    for (const endpoint of this.leaderEnds) {
      const endpointOnObjectPlane = util.sendPointToPlane(
        new Point(endpoint.x, endpoint.y),
        undefined,
        this.calcTransformMatrix(),
      );
      const geometry = this.getLeaderGeometryFromObjectEndpoint(
        endpointOnObjectPlane,
      );
      const objectToSceneMatrix = this.calcTransformMatrix();
      const startOnScenePlane =
        geometry.visibleLeaderStart.transform(objectToSceneMatrix);
      const endOnScenePlane = geometry.endpoint.transform(objectToSceneMatrix);
      const angle = Math.atan2(
        endOnScenePlane.y - startOnScenePlane.y,
        endOnScenePlane.x - startOnScenePlane.x,
      );
      const headLength = 12;
      const leftHeadOnScenePlane = new Point(
        endOnScenePlane.x - headLength * Math.cos(angle - Math.PI / 6),
        endOnScenePlane.y - headLength * Math.sin(angle - Math.PI / 6),
      );
      const rightHeadOnScenePlane = new Point(
        endOnScenePlane.x - headLength * Math.cos(angle + Math.PI / 6),
        endOnScenePlane.y - headLength * Math.sin(angle + Math.PI / 6),
      );
      const hitToleranceOnScenePlane =
        (this.leaderStrokeWidth / 2 + 6) / this.getViewportScale();

      const shaftDistance = distancePointToSegment(
        pointOnScenePlane,
        startOnScenePlane,
        endOnScenePlane,
      );
      if (shaftDistance <= hitToleranceOnScenePlane) {
        return true;
      }

      const leftHeadDistance = distancePointToSegment(
        pointOnScenePlane,
        leftHeadOnScenePlane,
        endOnScenePlane,
      );
      if (leftHeadDistance <= hitToleranceOnScenePlane) {
        return true;
      }

      const rightHeadDistance = distancePointToSegment(
        pointOnScenePlane,
        endOnScenePlane,
        rightHeadOnScenePlane,
      );
      if (rightHeadDistance <= hitToleranceOnScenePlane) {
        return true;
      }
    }

    return false;
  }

  private rebuildLeaderEndControls() {
    const nextControls: Record<string, Control> = {
      ...this.baseControls,
    };

    if (this.isPlacingLeaderEndpoint) {
      this.controls = nextControls;
      this.setControlsVisibility(HIDDEN_TRANSFORM_CONTROLS);
      return;
    }

    for (let index = 0; index < this.leaderEnds.length; index += 1) {
      nextControls[`${LEADER_END_CONTROL_KEY_PREFIX}${index}`] =
        createLeaderEndControl(index);
      nextControls[`${LEADER_DELETE_CONTROL_KEY_PREFIX}${index}`] =
        createLeaderDeleteControl(index);
    }

    this.controls = nextControls;
    this.setControlsVisibility(HIDDEN_TRANSFORM_CONTROLS);
  }

  private refreshVisuals() {
    const displayText = this.getDisplayText();
    this.text = displayText;
    if (this.removeFromCanvasIfEmpty()) {
      return;
    }
    this.textObject.set({
      text: displayText,
      fill: this.textFill,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      textAlign: this.textAlign,
    });

    this.rebuildLeaderEndControls();
    this.setCoords();
    this.dirty = true;
  }
}

classRegistry.setClass(LeaderTextWithArrow);
