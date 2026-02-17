"use client";

/**
 * Custom Fabric.js element composed of a text label and a leader arrow.
 * The arrow start is fixed to the text midpoint and only the endpoint is modeled.
 */

import {
  Control,
  FabricText,
  Group,
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
}

const DEFAULT_TEXT = "Text";
const DEFAULT_TEXT_FILL = "#f8fafc";
const DEFAULT_LEADER_STROKE = "#ffffff";
const DEFAULT_LEADER_STROKE_WIDTH = 5;
const DEFAULT_FONT_SIZE = 24;
const DEFAULT_FONT_FAMILY = "Arial";
const LEADER_END_CONTROL_KEY = "leaderEnd";
const LEADER_END_HANDLE_RADIUS = 6;
const LEADER_END_HANDLE_STROKE = "#ffffff";
const LEADER_END_HANDLE_FILL = "#111827";
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
    sizeX: LEADER_END_HANDLE_RADIUS * 2,
    sizeY: LEADER_END_HANDLE_RADIUS * 2,
    touchSizeX: LEADER_END_HANDLE_RADIUS * 4,
    touchSizeY: LEADER_END_HANDLE_RADIUS * 4,
    positionHandler: (_dim, finalMatrix, fabricObject) => {
      if (!(fabricObject instanceof LeaderTextWithArrow)) {
        return new Point(0, 0).transform(finalMatrix);
      }

      const endpointInObjectPlane =
        getLeaderEndpointInObjectPlane(fabricObject);
      const objectToViewportMatrix = util.multiplyTransformMatrices(
        fabricObject.getViewportTransform(),
        fabricObject.calcTransformMatrix(),
      );

      return endpointInObjectPlane.transform(objectToViewportMatrix);
    },
    actionHandler: (_eventData, transform, x, y) => {
      if (!(transform.target instanceof LeaderTextWithArrow)) {
        return false;
      }

      transform.target.setLeaderEnd({
        x,
        y,
      });
      transform.target.setCoords();
      transform.target.dirty = true;
      return true;
    },
    render: (ctx, left, top) => {
      ctx.save();
      ctx.fillStyle = LEADER_END_HANDLE_FILL;
      ctx.strokeStyle = LEADER_END_HANDLE_STROKE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(left, top, LEADER_END_HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
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

  private readonly textObject: FabricText;

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

    const textObject = new FabricText(text, {
      left: 0,
      top: 0,
      originX: "center",
      originY: "center",
      fill: textFill,
      fontSize,
      fontFamily,
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

  /** Scale custom internal geometry directly (for scale-to-geometry baking). */
  scaleInternalGeometry(scaleX: number, scaleY: number) {
    const uniformScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
    this.setFontSize(Math.max(1, this.fontSize * uniformScale));
  }

  /** Recompute arrow geometry using current text position and absolute endpoint. */
  syncLeaderToAbsoluteEndpoint() {
    this.refreshVisuals();
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

    const endpointOnGroupPlane = getLeaderEndpointInObjectPlane(this);
    const endpoint = {
      x: endpointOnGroupPlane.x,
      y: endpointOnGroupPlane.y,
    };
    const textBoxHalfWidth = this.textObject.getScaledWidth() / 2;
    const textBoxHalfHeight = this.textObject.getScaledHeight() / 2;
    const visibleLeaderStart = calculateLeaderStartOutsideTextBox(
      endpoint,
      textBoxHalfWidth,
      textBoxHalfHeight,
      DEFAULT_LEADER_STROKE_WIDTH * 0.75,
    );

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
    ctx.restore();
  }

  private refreshVisuals() {
    this.textObject.set({
      text: this.text,
      fill: this.textFill,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
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
      }),
    );
  }
}

classRegistry.setClass(LeaderTextWithArrow);
