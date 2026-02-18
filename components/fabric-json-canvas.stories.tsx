import { useRef, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import {
  FabricJsonCanvas,
  type FabricJsonCanvasHandle,
} from "./fabric-json-canvas";

const sampleModel: unknown = {
  version: "7.1.0",
  objects: [
    {
      type: "rect",
      left: 100,
      top: 120,
      width: 220,
      height: 130,
      fill: "transparent",
      stroke: "white",
      strokeWidth: 2,
    },
    {
      type: "ellipse",
      left: 430,
      top: 180,
      rx: 95,
      ry: 58,
      fill: "transparent",
      stroke: "white",
      strokeWidth: 2,
    },
    {
      type: "circle",
      left: 700,
      top: 170,
      radius: 62,
      fill: "transparent",
      stroke: "white",
      strokeWidth: 2,
    },
    {
      type: "leaderTextWithArrow",
      left: 290,
      top: 370,
      text: "Leader text",
      leaderEnds: [
        { x: 470, y: 230 },
        { x: 760, y: 170 },
      ],
      textFill: "white",
      leaderStroke: "white",
      leaderStrokeWidth: 2,
      fontSize: 14,
      fontFamily: "Arial",
    },
  ],
};

const meta: Meta<typeof FabricJsonCanvas> = {
  title: "Components/FabricJsonCanvas",
  component: FabricJsonCanvas,
  args: {
    viewportWidth: 960,
    viewportHeight: 540,
    initialModel: sampleModel,
  },
  parameters: {
    layout: "centered",
  },
};

export default meta;

type Story = StoryObj<typeof FabricJsonCanvas>;

function StoryCanvas(props: ComponentProps<typeof FabricJsonCanvas>) {
  const canvasRef = useRef<FabricJsonCanvasHandle>(null);
  return <FabricJsonCanvas ref={canvasRef} {...props} />;
}

export const Empty: Story = {
  args: {
    initialModel: undefined,
  },
  render: (args) => <StoryCanvas {...args} />,
};

export const WithModel: Story = {
  render: (args) => <StoryCanvas {...args} />,
};

export const WithBackgroundImage: Story = {
  args: {
    backgroundImageUrl: "/placeholder-species.jpeg",
  },
  render: (args) => <StoryCanvas {...args} />,
};
