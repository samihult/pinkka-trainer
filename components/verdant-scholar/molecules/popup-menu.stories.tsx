/** Storybook stories for the Verdant Scholar popup-menu molecule. */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Bird, Leaf, Sparkles } from "lucide-react";

import { withVerdantScholarTheme } from "../storybook-utils";
import {
  VerdantScholarPopupMenu,
  type VerdantScholarPopupMenuItem,
} from "./popup-menu";

const speciesItems: VerdantScholarPopupMenuItem[] = [
  {
    id: "1",
    label: "Asplenium viride",
    description: "viherraunioinen",
    leading: <span className="text-xs font-semibold">1</span>,
  },
  {
    id: "2",
    label: "Botrychium boreale",
    description: "pohjannoidanlukko",
    leading: <span className="text-xs font-semibold">2</span>,
  },
  {
    id: "3",
    label: "Cryptogramma crispa",
    description: "liesu",
    leading: <span className="text-xs font-semibold">3</span>,
  },
  {
    id: "4",
    label: "Dryopteris expansa",
    description: "isoalvejuuri",
    leading: <span className="text-xs font-semibold">4</span>,
  },
  {
    id: "5",
    label: "Equisetum variegatum",
    description: "kirjokorte",
    leading: <span className="text-xs font-semibold">5</span>,
  },
  {
    id: "6",
    label: "Woodsia ilvensis",
    description: "karvakiviyrtti",
    leading: <span className="text-xs font-semibold">6</span>,
  },
];

const actionItems: VerdantScholarPopupMenuItem[] = [
  {
    id: "flora",
    label: "Plant Field Notes",
    description: "Editorial notes and habitat cues",
    leading: <Leaf className="size-4" />,
  },
  {
    id: "fauna",
    label: "Bird Atlas",
    description: "Behavior, plumage, and range snapshots",
    leading: <Bird className="size-4" />,
  },
  {
    id: "highlights",
    label: "Curator Highlights",
    description: "Featured collections from this week",
    leading: <Sparkles className="size-4" />,
  },
];

function SpeciesSelectorDemo() {
  const [selectedItemId, setSelectedItemId] = useState("4");

  return (
    <div className="flex min-h-[22rem] items-end justify-center rounded-[32px] bg-[linear-gradient(180deg,rgba(247,248,243,0.96),rgba(252,249,248,1))] p-8">
      <VerdantScholarPopupMenu
        items={speciesItems}
        label={`${selectedItemId} / ${speciesItems.length}`}
        onSelect={(item) => setSelectedItemId(item.id)}
        selectedItemId={selectedItemId}
        triggerAriaLabel="Open species selector"
      />
    </div>
  );
}

function QuickActionsDemo() {
  const [selectedItemId, setSelectedItemId] = useState("flora");

  return (
    <div className="flex min-h-[22rem] items-start justify-start rounded-[32px] bg-[linear-gradient(180deg,rgba(252,249,248,0.96),rgba(244,246,236,1))] p-8">
      <VerdantScholarPopupMenu
        align="start"
        items={actionItems}
        label="Archive Views"
        onSelect={(item) => setSelectedItemId(item.id)}
        selectedItemId={selectedItemId}
        side="bottom"
        triggerAriaLabel="Open archive views"
      />
    </div>
  );
}

const meta = {
  title: "Verdant Scholar/Molecules/Popup Menu",
  component: VerdantScholarPopupMenu,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    items: speciesItems,
    label: "4 / 6",
    selectedItemId: "4",
    triggerAriaLabel: "Open popup menu",
  },
  argTypes: {
    onSelect: { control: false },
  },
  render: (args) => (
    <div className="flex min-h-[22rem] items-end justify-center rounded-[32px] bg-[linear-gradient(180deg,rgba(247,248,243,0.96),rgba(252,249,248,1))] p-8">
      <VerdantScholarPopupMenu {...args} />
    </div>
  ),
} satisfies Meta<typeof VerdantScholarPopupMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SpeciesSelector: Story = {
  render: () => <SpeciesSelectorDemo />,
};

export const QuickActions: Story = {
  render: () => <QuickActionsDemo />,
};
