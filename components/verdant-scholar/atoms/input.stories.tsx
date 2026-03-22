/** Storybook stories for the Verdant Scholar input atom. */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { VerdantScholarInput } from "./input";
import { withVerdantScholarTheme } from "../storybook-utils";

function InteractiveSearchDemo() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  return (
    <div className="max-w-2xl space-y-4">
      <VerdantScholarInput
        actionLabel="Search"
        aria-label="Search species"
        onActionClick={() => setSubmittedQuery(query)}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search species, genus, or family..."
        value={query}
      />
      <p className="text-sm text-[var(--vs-color-on-surface-variant)]">
        Live query: {query || "Empty"}
      </p>
      <p className="text-sm text-[var(--vs-color-on-surface-variant)]">
        Submitted query: {submittedQuery || "Nothing submitted yet"}
      </p>
    </div>
  );
}

const meta = {
  title: "Verdant Scholar/Atoms/Input",
  component: VerdantScholarInput,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    placeholder: "Search species, genus, or family...",
  },
  argTypes: {
    icon: { control: false },
    onActionClick: { control: false },
  },
  render: (args) => (
    <div className="max-w-2xl">
      <VerdantScholarInput aria-label="Search species" {...args} />
    </div>
  ),
} satisfies Meta<typeof VerdantScholarInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {};

export const WithAction: Story = {
  args: {
    actionLabel: "Search",
  },
};

export const InteractiveSearch: Story = {
  render: () => <InteractiveSearchDemo />,
};
