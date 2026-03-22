/** Storybook stories for the Verdant Scholar specimen-card molecule. */
import type { Meta, StoryObj } from "@storybook/react";

import { speciesExplorerData } from "../story-data";
import { VerdantScholarSpecimenCard } from "./specimen-card";
import { withVerdantScholarTheme } from "../storybook-utils";

const meta = {
  title: "Verdant Scholar/Molecules/Specimen Card",
  component: VerdantScholarSpecimenCard,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: speciesExplorerData.cards[0],
  render: (args) => (
    <div className="max-w-sm">
      <VerdantScholarSpecimenCard {...args} />
    </div>
  ),
} satisfies Meta<typeof VerdantScholarSpecimenCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithStatus: Story = {};

export const WithoutStatus: Story = {
  args: {
    ...speciesExplorerData.cards[1],
    status: undefined,
  },
};
