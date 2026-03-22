/** Storybook stories for the Verdant Scholar stack-card molecule. */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { learningDashboardData } from "../story-data";
import { VerdantScholarStackCard } from "./stack-card";
import { withVerdantScholarTheme } from "../storybook-utils";

function InteractiveProgressCardDemo() {
  const [progress, setProgress] = useState(45);

  return (
    <div className="max-w-md space-y-4">
      <VerdantScholarStackCard
        description="Adjust the progress to preview how the card handles live learning updates."
        eyebrow="Adaptive Demo"
        meta={`${progress}% complete`}
        progress={progress}
        title="Curated Study Stack"
      />
      <input
        className="w-full accent-[var(--vs-color-primary)]"
        max={100}
        min={0}
        onChange={(event) => setProgress(Number(event.target.value))}
        type="range"
        value={progress}
      />
    </div>
  );
}

const meta = {
  title: "Verdant Scholar/Molecules/Stack Card",
  component: VerdantScholarStackCard,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: learningDashboardData.sideCard,
  render: (args) => (
    <div className="max-w-md">
      <VerdantScholarStackCard {...args} />
    </div>
  ),
} satisfies Meta<typeof VerdantScholarStackCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Surface: Story = {};

export const WithImageAndProgress: Story = {
  args: {
    ...learningDashboardData.highlight,
    tone: "primary",
  },
};

export const InteractiveProgress: Story = {
  render: () => <InteractiveProgressCardDemo />,
};
