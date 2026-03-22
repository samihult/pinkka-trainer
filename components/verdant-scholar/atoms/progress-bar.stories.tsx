/** Storybook stories for the Verdant Scholar progress-bar atom. */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { VerdantScholarProgressBar } from "./progress-bar";
import { withVerdantScholarTheme } from "../storybook-utils";

function AdjustableProgressDemo() {
  const [value, setValue] = useState(68);

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm text-[var(--vs-color-on-surface-variant)]">
        <span>Current module readiness</span>
        <span>{value}%</span>
      </div>
      <VerdantScholarProgressBar value={value} />
      <input
        className="w-full accent-[var(--vs-color-primary)]"
        max={100}
        min={0}
        onChange={(event) => setValue(Number(event.target.value))}
        type="range"
        value={value}
      />
    </div>
  );
}

const meta = {
  title: "Verdant Scholar/Atoms/Progress Bar",
  component: VerdantScholarProgressBar,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    value: 68,
    tone: "primary",
  },
  render: (args) => (
    <div className="max-w-xl">
      <VerdantScholarProgressBar {...args} />
    </div>
  ),
} satisfies Meta<typeof VerdantScholarProgressBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    tone: "secondary",
    value: 42,
  },
};

export const AdjustableProgress: Story = {
  render: () => <AdjustableProgressDemo />,
};
