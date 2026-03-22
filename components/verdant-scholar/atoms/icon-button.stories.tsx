/** Storybook stories for the Verdant Scholar icon-button atom. */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Bookmark, Grid3X3, Search } from "lucide-react";

import { VerdantScholarIconButton } from "./icon-button";
import { withVerdantScholarTheme } from "../storybook-utils";

function InteractiveToolbarDemo() {
  const [activeTool, setActiveTool] = useState("search");

  const tools = [
    { icon: Search, id: "search", label: "Search" },
    { icon: Bookmark, id: "bookmark", label: "Bookmark" },
    { icon: Grid3X3, id: "grid", label: "Grid" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <VerdantScholarIconButton
              aria-label={tool.label}
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              tone={activeTool === tool.id ? "activeToolbar" : "toolbar"}
            >
              <Icon className="size-4" />
            </VerdantScholarIconButton>
          );
        })}
      </div>
      <p className="text-sm text-[var(--vs-color-on-surface-variant)]">
        Active tool: {activeTool}
      </p>
    </div>
  );
}

const meta = {
  title: "Verdant Scholar/Atoms/Icon Button",
  component: VerdantScholarIconButton,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    size: "md",
    tone: "ghost",
  },
  argTypes: {
    children: { control: false },
  },
  render: (args) => (
    <VerdantScholarIconButton aria-label="Search" {...args}>
      <Search className="size-4" />
    </VerdantScholarIconButton>
  ),
} satisfies Meta<typeof VerdantScholarIconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ghost: Story = {};

export const Surface: Story = {
  args: {
    tone: "surface",
  },
};

export const InteractiveToolbar: Story = {
  render: () => <InteractiveToolbarDemo />,
};
