"use client";

/**
 * Custom Fabric.js element composed of a text label and a leader arrow.
 * The arrow start is fixed to the text midpoint and only the endpoint is modeled.
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
  /** Leader endpoint modeled as one absolute point in canvas coordinates. */
  leaderEnd?: LeaderArrowEndpoint;
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
  /** Leader endpoint modeled as one absolute point in canvas coordinates. */
  leaderEnd: LeaderArrowEndpoint;
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
const LEADER_END_CONTROL_KEY = "leaderEnd";
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

function calculateLeaderStartOutsideTextBox(
  endpoint: LeaderArrowEndpoint,
  textBoxHalfWidth: number,
  textBoxHalfHeight: number,
  padding: number,
): LeaderArrowEndpoint {
  const dx = endpoint.x;
  const dy = endpoint.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx < 0.0001 && absDy < 0.0001) {
    return { x: 0, y: 0 };
  }

  const halfWidth = Math.max(0, textBoxHalfWidth + padding);
  const halfHeight = Math.max(0, textBoxHalfHeight + padding);
  const hitVerticalEdge = absDx * halfHeight >= absDy * halfWidth;
  const t = hitVerticalEdge
    ? halfWidth / Math.max(absDx, 0.0001)
    : halfHeight / Math.max(absDy, 0.0001);
  const clampedT = Math.min(1, Math.max(0, t));

  return {
    x: dx * clampedT,
    y: dy * clampedT,
  };
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

function getLeaderEndpointInObjectPlane(object: LeaderTextWithArrow) {
  return util.sendPointToPlane(
    new Point(object.leaderEnd.x, object.leaderEnd.y),
    undefined,
    object.calcTransformMatrix(),
  );
}

function createLeaderEndControl() {
  return new Control({
    actionName: "modifyLeaderEnd",
    cursorStyle: "crosshair",
    positionHandler: function (_dim, finalMatrix, fabricObject) {
      if (!(fabricObject instanceof LeaderTextWithArrow)) {
        return new Point(0, 0).transform(finalMatrix);
      }

      return fabricObject.getLeaderHandleCenterInViewportPlane(this as Control);
    },
    actionHandler: function (_eventData, transform, x, y) {
      if (!(transform.target instanceof LeaderTextWithArrow)) {
        return false;
      }

      const resolvedEndpoint = transform.target.resolveEndpointFromHandleCenter(
        new Point(x, y),
        this as Control,
      );
      transform.target.setLeaderEnd(resolvedEndpoint);
      transform.target.setCoords();
      transform.target.dirty = true;
      return true;
    },
  });
}

/**
 * Fabric custom class that combines a text label and a leader arrow with fixed
 * start at text midpoint.
 */
export class LeaderTextWithArrow extends Group {
  /** Registered Fabric type name used by JSON deserialization. */
  static type = "leaderTextWithArrow" as const;
  /** Extra fields that should be included in Fabric JSON serialization. */
  static customProperties = [
    "text",
    "leaderEnd",
    "textFill",
    "leaderStroke",
    "leaderStrokeWidth",
    "fontSize",
    "fontFamily",
    "textAlign",
  ];

  /** Current label text content. */
  declare text: string;
  /** Current leader endpoint in absolute canvas coordinates. */
  declare leaderEnd: LeaderArrowEndpoint;
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
  private editingTextObject: IText | null = null;
  private disposeEditingListeners: (() => void) | null = null;

  constructor(options: LeaderTextWithArrowOptions = {}) {
    const defaultAbsoluteEndpoint = {
      x: (options.left ?? 0) + 110,
      y: (options.top ?? 0) - 60,
    };
    const endpoint = options.leaderEnd ?? defaultAbsoluteEndpoint;
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

    this.textObject = textObject;
    this.text = text;
    this.leaderEnd = { ...endpoint };
    this.textFill = textFill;
    this.leaderStroke = leaderStroke;
    this.leaderStrokeWidth = leaderStrokeWidth;
    this.fontSize = fontSize;
    this.fontFamily = fontFamily;
    this.textAlign = textAlign;
    this.controls = {
      ...this.controls,
      [LEADER_END_CONTROL_KEY]: createLeaderEndControl(),
    };
    this.setControlsVisibility(HIDDEN_TRANSFORM_CONTROLS);
    this.hasBorders = false;

    this.refreshVisuals();
  }

  /** Update text content while keeping leader start anchored to text midpoint. */
  setTextContent(nextText: string) {
    this.text = nextText;
    this.refreshVisuals();
  }

  /** Update the leader endpoint point while keeping arrow start fixed. */
  setLeaderEnd(nextEndpoint: LeaderArrowEndpoint) {
    this.leaderEnd = {
      x: nextEndpoint.x,
      y: nextEndpoint.y,
    };
    this.refreshVisuals();
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

  /** Recompute arrow geometry using current text position and absolute endpoint. */
  syncLeaderToAbsoluteEndpoint() {
    this.refreshVisuals();
  }

  /** Recompute selection-dependent visuals (placeholder text + border). */
  syncSelectionVisuals() {
    this.refreshVisuals();
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

  /** Compute leader geometry in object space using optional endpoint override. */
  getLeaderGeometryInObjectPlane(endpointOverride?: Point) {
    const endpoint = endpointOverride ?? getLeaderEndpointInObjectPlane(this);
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
      visibleLeaderStart: new Point(visibleLeaderStart.x, visibleLeaderStart.y),
    };
  }

  /** Compute leader handle center in viewport space so its edge touches arrow head. */
  getLeaderHandleCenterInViewportPlane(control?: Control) {
    const { endpoint, visibleLeaderStart } =
      this.getLeaderGeometryInObjectPlane();
    const objectToSceneMatrix = this.calcTransformMatrix();
    const sceneToViewportMatrix = this.getViewportTransform();
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
    handleCenterOnScenePlane: Point,
    control?: Control,
  ): LeaderArrowEndpoint {
    const handleHalfSizeOnScenePlane =
      this.getControlSize(control) / (2 * this.getViewportScale());
    let endpointOnScenePlane = handleCenterOnScenePlane.clone();

    for (let iteration = 0; iteration < 2; iteration += 1) {
      const endpointOnObjectPlane = util.sendPointToPlane(
        endpointOnScenePlane,
        undefined,
        this.calcTransformMatrix(),
      );
      const { visibleLeaderStart } = this.getLeaderGeometryInObjectPlane(
        endpointOnObjectPlane,
      );
      const startOnScenePlane = visibleLeaderStart.transform(
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

  private isPointNearLeaderLine(pointOnScenePlane: Point) {
    const { endpoint, visibleLeaderStart } =
      this.getLeaderGeometryInObjectPlane();
    const objectToSceneMatrix = this.calcTransformMatrix();
    const startOnScenePlane = visibleLeaderStart.transform(objectToSceneMatrix);
    const endOnScenePlane = endpoint.transform(objectToSceneMatrix);
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
    return rightHeadDistance <= hitToleranceOnScenePlane;
  }

  /** Returns true when a scene-space point hits the visible leader arrow line/head. */
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

    const { endpoint, visibleLeaderStart } =
      this.getLeaderGeometryInObjectPlane();

    const leaderStroke = DEFAULT_LEADER_STROKE;
    const leaderStrokeWidth = DEFAULT_LEADER_STROKE_WIDTH;
    const deltaX = endpoint.x - visibleLeaderStart.x;
    const deltaY = endpoint.y - visibleLeaderStart.y;
    const angle = Math.atan2(deltaY, deltaX);
    const headLength = 12;
    const leftHeadX = endpoint.x - headLength * Math.cos(angle - Math.PI / 6);
    const leftHeadY = endpoint.y - headLength * Math.sin(angle - Math.PI / 6);
    const rightHeadX = endpoint.x - headLength * Math.cos(angle + Math.PI / 6);
    const rightHeadY = endpoint.y - headLength * Math.sin(angle + Math.PI / 6);

    ctx.save();
    ctx.strokeStyle = leaderStroke;
    ctx.lineWidth = leaderStrokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(visibleLeaderStart.x, visibleLeaderStart.y);
    ctx.lineTo(endpoint.x, endpoint.y);
    ctx.moveTo(leftHeadX, leftHeadY);
    ctx.lineTo(endpoint.x, endpoint.y);
    ctx.lineTo(rightHeadX, rightHeadY);
    ctx.stroke();

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

    ctx.restore();
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

    this.setCoords();
    this.dirty = true;
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
        leaderEnd: object.leaderEnd,
        textFill: object.textFill,
        leaderStroke: object.leaderStroke,
        leaderStrokeWidth: object.leaderStrokeWidth,
        fontSize: object.fontSize,
        fontFamily: object.fontFamily,
        textAlign: object.textAlign ?? DEFAULT_TEXT_ALIGN,
      }),
    );
  }
}

classRegistry.setClass(LeaderTextWithArrow);
