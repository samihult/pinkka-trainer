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
const LEADER_TEXT_CLIP_EXTRA_PADDING = 4;
const EMPTY_TEXT_PLACEHOLDER = "Add text";
const TEXT_BORDER_PADDING = 4;
const CREATE_LEADER_HANDLE_RADIUS = 5;
const CREATE_LEADER_HANDLE_GAP = 8;
const CREATE_LEADER_HANDLE_HIT_TOLERANCE = 4;
const LEADER_END_CONTROL_KEY_PREFIX = "leaderEnd-";
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

function calculateLeaderStartOutsideTextBox(
  endpoint: Point,
  textBoxHalfWidth: number,
  textBoxHalfHeight: number,
  padding: number,
) {
  const dx = endpoint.x;
  const dy = endpoint.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx < 0.0001 && absDy < 0.0001) {
    return new Point(0, 0);
  }

  const halfWidth = Math.max(0, textBoxHalfWidth + padding);
  const halfHeight = Math.max(0, textBoxHalfHeight + padding);
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
  return new Control({
    actionName: `modifyLeaderEnd:${endpointIndex}`,
    cursorStyle: "crosshair",
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
  private isHoveringTextBox = false;
  private isPlacingLeaderEndpoint = false;
  private pendingLeaderEndpoint: Point | null = null;

  constructor(options: LeaderTextWithArrowOptions = {}) {
    const defaultAbsoluteEndpoint = {
      x: (options.left ?? 0) + 110,
      y: (options.top ?? 0) - 60,
    };
    const text = options.text ?? DEFAULT_TEXT;
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

    if (!this.hasTextContent()) {
      this.clearAllLeaderArrows();
    }
    this.refreshVisuals();
  }

  /** Update text content while keeping leader starts anchored to text midpoint. */
  setTextContent(nextText: string) {
    this.text = nextText;
    if (!this.hasTextContent()) {
      this.clearAllLeaderArrows();
    }
    this.refreshVisuals();
  }

  /** Backward-compatible setter for a single leader endpoint. */
  setLeaderEnd(nextEndpoint: LeaderArrowEndpoint | null) {
    this.setLeaderEnds(nextEndpoint ? [nextEndpoint] : []);
  }

  /** Set full endpoint list for all leader arrows. */
  setLeaderEnds(nextEndpoints: LeaderArrowEndpoint[]) {
    if (!this.hasTextContent()) {
      this.clearAllLeaderArrows();
      this.refreshVisuals();
      return;
    }

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
    this.dirty = true;
  }

  /** Finalize drag and delete that arrow when dropped onto text while text exists. */
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
      this.refreshVisuals();
    }

    this.isDraggingLeaderHandle = false;
    this.draggingLeaderHandleIndex = null;
    this.isLeaderDeletionHoverActive = false;
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
    if (!this.hasTextContent() || this.isPlacingLeaderEndpoint) {
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

  /** Enter endpoint-placement mode for creating one additional leader arrow. */
  beginLeaderEndpointPlacement(startPointOnScenePlane: Point) {
    if (!this.hasTextContent()) {
      return;
    }

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

    if (this.hasTextContent()) {
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
    } else {
      this.clearAllLeaderArrows();
      this.refreshVisuals();
    }

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
      editable: true,
      hasControls: false,
      hasBorders: true,
      borderColor: this.getSelectionBorderColor(),
      borderScaleFactor: this.borderScaleFactor,
      padding: TEXT_BORDER_PADDING,
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

  containsPoint(point: Point) {
    return super.containsPoint(point) || this.isPointNearLeaderLine(point);
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
        -textWidth / 2 - TEXT_BORDER_PADDING,
        -textHeight / 2 - TEXT_BORDER_PADDING,
        textWidth + TEXT_BORDER_PADDING * 2,
        textHeight + TEXT_BORDER_PADDING * 2,
      );
    }

    if (this.isCreateLeaderHandleVisible()) {
      this.drawCreateLeaderHandle(ctx);
    }

    if (this.isDraggingLeaderHandle && this.isLeaderDeletionHoverActive) {
      this.drawDeleteIndicator(ctx);
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
    return this.text.trim().length > 0;
  }

  private syncLegacyLeaderEnd() {
    this.leaderEnd = this.leaderEnds[0] ?? null;
  }

  private isValidLeaderIndex(endpointIndex: number) {
    return endpointIndex >= 0 && endpointIndex < this.leaderEnds.length;
  }

  private clearAllLeaderArrows() {
    this.leaderEnds = [];
    this.syncLegacyLeaderEnd();
    this.isDraggingLeaderHandle = false;
    this.draggingLeaderHandleIndex = null;
    this.isLeaderDeletionHoverActive = false;
    this.isPlacingLeaderEndpoint = false;
    this.pendingLeaderEndpoint = null;
  }

  private getLeaderGeometryFromObjectEndpoint(endpoint: Point) {
    const textBoxHalfWidth = this.textObject.getScaledWidth() / 2;
    const textBoxHalfHeight = this.textObject.getScaledHeight() / 2;
    const leaderClipPadding =
      this.leaderStrokeWidth * 0.75 + LEADER_TEXT_CLIP_EXTRA_PADDING;
    const visibleLeaderStart = calculateLeaderStartOutsideTextBox(
      endpoint,
      textBoxHalfWidth,
      textBoxHalfHeight,
      leaderClipPadding,
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
    if (this.pendingLeaderEndpoint && this.hasTextContent()) {
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
    if (this.shouldShowEmptyTextPlaceholder()) {
      return EMPTY_TEXT_PLACEHOLDER;
    }
    return this.text;
  }

  private shouldShowEmptyTextPlaceholder() {
    return this.isSelectedOnCanvas() && this.text.trim().length === 0;
  }

  private shouldShowTextBorder() {
    return this.isSelectedOnCanvas();
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
    return this.hasTextContent() && this.isValidLeaderIndex(endpointIndex);
  }

  private isCreateLeaderHandleVisible() {
    return (
      this.hasTextContent() &&
      this.isHoveringTextBox &&
      !this.isPlacingLeaderEndpoint
    );
  }

  private getCreateLeaderHandleCenterOnObjectPlane() {
    const textHalfHeight = Math.max(1, this.textObject.getScaledHeight()) / 2;
    const offset =
      textHalfHeight +
      TEXT_BORDER_PADDING +
      CREATE_LEADER_HANDLE_GAP +
      CREATE_LEADER_HANDLE_RADIUS;
    return new Point(0, -offset);
  }

  private getCreateLeaderHandleCenterInScenePlane() {
    return this.getCreateLeaderHandleCenterOnObjectPlane().transform(
      this.calcTransformMatrix(),
    );
  }

  private isScenePointInsideTextBounds(
    scenePoint: LeaderArrowEndpoint | Point,
  ) {
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
    const detectionPadding = TEXT_BORDER_PADDING;

    return (
      pointOnObjectPlane.x >= -textBoxHalfWidth - detectionPadding &&
      pointOnObjectPlane.x <= textBoxHalfWidth + detectionPadding &&
      pointOnObjectPlane.y >= -textBoxHalfHeight - detectionPadding &&
      pointOnObjectPlane.y <= textBoxHalfHeight + detectionPadding
    );
  }

  private drawDeleteIndicator(ctx: CanvasRenderingContext2D) {
    const viewportScale = this.getViewportScale();
    const iconSize = 14 / viewportScale;
    const iconHalfSize = iconSize / 2;
    const iconMargin = 8 / viewportScale;
    const textBoxHalfWidth = this.textObject.getScaledWidth() / 2;
    const iconCenterX =
      textBoxHalfWidth + TEXT_BORDER_PADDING + iconMargin + iconHalfSize;
    const iconCenterY = 0;
    const borderWidth = 1 / viewportScale;
    const glyphWidth = iconSize * 0.52;
    const glyphHeight = iconSize * 0.5;

    ctx.save();
    ctx.translate(iconCenterX, iconCenterY);
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

    ctx.save();
    ctx.fillStyle = "white";
    ctx.strokeStyle = this.getSelectionBorderColor();
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(handleCenter.x, handleCenter.y, handleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
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

    if (this.hasTextContent()) {
      for (let index = 0; index < this.leaderEnds.length; index += 1) {
        nextControls[`${LEADER_END_CONTROL_KEY_PREFIX}${index}`] =
          createLeaderEndControl(index);
      }
    }

    this.controls = nextControls;
    this.setControlsVisibility(HIDDEN_TRANSFORM_CONTROLS);
  }

  private refreshVisuals() {
    const displayText = this.getDisplayText();
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
