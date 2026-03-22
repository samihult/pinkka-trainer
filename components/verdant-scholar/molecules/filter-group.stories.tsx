/** Storybook stories for the Verdant Scholar filter-group molecule. */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { speciesExplorerData } from "../story-data";
import {
  VerdantScholarFilterGroup,
  type VerdantScholarFilterItem,
} from "./filter-group";
import { withVerdantScholarTheme } from "../storybook-utils";

function InteractiveCheckboxFilterDemo() {
  const [items, setItems] = useState(
    speciesExplorerData.filterGroups[0]?.items ?? [],
  );

  return (
    <div className="max-w-sm">
      <VerdantScholarFilterGroup
        items={items}
        onItemSelect={(selectedItem) =>
          setItems((currentItems) =>
            currentItems.map((item) =>
              item.label === selectedItem.label
                ? { ...item, selected: !item.selected }
                : item,
            ),
          )
        }
        title="Taxonomy"
        variant="checkboxes"
      />
    </div>
  );
}

function InteractiveChipFilterDemo() {
  const [items, setItems] = useState(
    speciesExplorerData.filterGroups[1]?.items ?? [],
  );

  return (
    <div className="max-w-md">
      <VerdantScholarFilterGroup
        items={items}
        onItemSelect={(selectedItem) =>
          setItems((currentItems) =>
            currentItems.map((item) => ({
              ...item,
              selected: item.label === selectedItem.label,
            })),
          )
        }
        title="Habitat"
        variant="chips"
      />
    </div>
  );
}

const meta = {
  title: "Verdant Scholar/Molecules/Filter Group",
  component: VerdantScholarFilterGroup,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    title: speciesExplorerData.filterGroups[0]?.title ?? "Taxonomy",
    variant: speciesExplorerData.filterGroups[0]?.variant ?? "checkboxes",
    items: speciesExplorerData.filterGroups[0]?.items ?? [],
  },
  argTypes: {
    onItemSelect: { control: false },
  },
  render: (args) => (
    <div className="max-w-sm">
      <VerdantScholarFilterGroup {...args} />
    </div>
  ),
} satisfies Meta<typeof VerdantScholarFilterGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Checkboxes: Story = {};

export const InteractiveCheckboxes: Story = {
  render: () => <InteractiveCheckboxFilterDemo />,
};

export const InteractiveChips: Story = {
  render: () => <InteractiveChipFilterDemo />,
};

export const Counts: Story = {
  args: {
    items: speciesExplorerData.filterGroups[2]
      ?.items as VerdantScholarFilterItem[],
    title: speciesExplorerData.filterGroups[2]?.title ?? "Conservation Status",
    variant: "counts",
  },
};
