/** Storybook stories for the Verdant Scholar button atom. */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ArrowRight, Sparkles } from "lucide-react";

import { VerdantScholarButton } from "./button";
import { withVerdantScholarTheme } from "../storybook-utils";

function InteractiveButtonDemo() {
  const [clicks, setClicks] = useState(0);

  return (
    <div className="space-y-4">
      <VerdantScholarButton onClick={() => setClicks((value) => value + 1)}>
        Track Clicks
      </VerdantScholarButton>
      <p className="text-sm text-[var(--vs-color-on-surface-variant)]">
        Click count: {clicks}
      </p>
    </div>
  );
}

const meta = {
  title: "Verdant Scholar/Atoms/Button",
  component: VerdantScholarButton,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    children: "Primary CTA",
    size: "md",
    variant: "primary",
  },
  argTypes: {
    leadingIcon: { control: false },
    trailingIcon: { control: false },
  },
} satisfies Meta<typeof VerdantScholarButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    children: "Secondary CTA",
    variant: "secondary",
  },
};

export const WithIcons: Story = {
  args: {
    children: "Begin Study",
    leadingIcon: <Sparkles className="size-4" />,
    trailingIcon: <ArrowRight className="size-4" />,
  },
};

export const InteractiveCounter: Story = {
  render: () => <InteractiveButtonDemo />,
};
