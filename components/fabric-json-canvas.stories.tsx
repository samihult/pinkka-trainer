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
      fill: "rgba(255, 255, 255, 0.18)",
      stroke: "#f8fafc",
      strokeWidth: 2,
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
