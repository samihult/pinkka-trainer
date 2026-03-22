/** Storybook stories for the Verdant Scholar feature-tile molecule. */
import type { Meta, StoryObj } from "@storybook/react";

import { homeLandingData } from "../story-data";
import { VerdantScholarFeatureTile } from "./feature-tile";
import { withVerdantScholarTheme } from "../storybook-utils";

const meta = {
  title: "Verdant Scholar/Molecules/Feature Tile",
  component: VerdantScholarFeatureTile,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: homeLandingData.featureTiles[0],
  render: (args) => (
    <div className="max-w-3xl">
      <VerdantScholarFeatureTile {...args} />
    </div>
  ),
} satisfies Meta<typeof VerdantScholarFeatureTile>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Hero: Story = {};

export const Wide: Story = {
  args: {
    ...homeLandingData.featureTiles[1],
    emphasis: "wide",
  },
};

export const Compact: Story = {
  args: {
    ...homeLandingData.featureTiles[2],
    emphasis: "compact",
  },
};
