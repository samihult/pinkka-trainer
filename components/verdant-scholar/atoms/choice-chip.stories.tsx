/** Storybook stories for the Verdant Scholar choice-chip atom. */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { withVerdantScholarTheme } from "../storybook-utils";
import { VerdantScholarChoiceChip } from "./choice-chip";

function InteractiveChoiceChips() {
  const [selectedId, setSelectedId] = useState("species");

  const options = [
    { id: "species", label: "Species" },
    { id: "genus", label: "Genus" },
    { id: "family", label: "Family" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <VerdantScholarChoiceChip
          key={option.id}
          onClick={() => setSelectedId(option.id)}
          selected={selectedId === option.id}
        >
          {option.label}
        </VerdantScholarChoiceChip>
      ))}
    </div>
  );
}

const meta = {
  title: "Verdant Scholar/Atoms/Choice Chip",
  component: VerdantScholarChoiceChip,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    children: "Species",
    selected: true,
  },
} satisfies Meta<typeof VerdantScholarChoiceChip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Selected: Story = {};

export const Unselected: Story = {
  args: {
    selected: false,
  },
};

export const Interactive: Story = {
  render: () => <InteractiveChoiceChips />,
};
