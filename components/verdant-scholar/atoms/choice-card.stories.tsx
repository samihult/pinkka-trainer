/** Storybook stories for the Verdant Scholar choice-card atom. */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CheckCircle2, Circle, Globe2, PenLine } from "lucide-react";

import { withVerdantScholarTheme } from "../storybook-utils";
import { VerdantScholarChoiceCard } from "./choice-card";

function InteractiveChoiceCards() {
  const [selectedId, setSelectedId] = useState("multiple-choice");

  const options = [
    {
      description: "Identify the specimen from four distinct options.",
      icon: <PenLine className="size-4" />,
      id: "multiple-choice",
      title: "Multiple Choice",
    },
    {
      description: "Recall and type the nomenclature manually.",
      icon: <Globe2 className="size-4" />,
      id: "write-name",
      title: "Write Name",
    },
  ];

  return (
    <div className="space-y-3">
      {options.map((option) => (
        <VerdantScholarChoiceCard
          description={option.description}
          key={option.id}
          leading={
            selectedId === option.id ? (
              <CheckCircle2 className="size-4 text-[var(--vs-color-primary)]" />
            ) : (
              <Circle className="size-4 text-[var(--vs-color-on-surface-variant)]" />
            )
          }
          onClick={() => setSelectedId(option.id)}
          selected={selectedId === option.id}
          title={option.title}
          trailing={
            <div className="rounded-full bg-[color:rgba(63,106,0,0.08)] p-2 text-[var(--vs-color-primary)]">
              {option.icon}
            </div>
          }
        />
      ))}
    </div>
  );
}

const meta = {
  title: "Verdant Scholar/Atoms/Choice Card",
  component: VerdantScholarChoiceCard,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    description: "Identify the specimen from four distinct options.",
    selected: true,
    title: "Multiple Choice",
  },
} satisfies Meta<typeof VerdantScholarChoiceCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Selected: Story = {
  args: {
    leading: <CheckCircle2 className="size-4 text-[var(--vs-color-primary)]" />,
  },
};

export const Unselected: Story = {
  args: {
    leading: (
      <Circle className="size-4 text-[var(--vs-color-on-surface-variant)]" />
    ),
    selected: false,
  },
};

export const Interactive: Story = {
  render: () => <InteractiveChoiceCards />,
};
