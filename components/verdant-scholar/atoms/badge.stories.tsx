/** Storybook stories for the Verdant Scholar badge atom. */
import type { Meta, StoryObj } from "@storybook/react";

import { VerdantScholarBadge, type VerdantScholarBadgeProps } from "./badge";
import { withVerdantScholarTheme } from "../storybook-utils";

const meta = {
  title: "Verdant Scholar/Atoms/Badge",
  component: VerdantScholarBadge,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    children: "Taxonomy Tag",
    tone: "primary",
  },
  render: (args) => <VerdantScholarBadge {...args} />,
} satisfies Meta<typeof VerdantScholarBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Neutral: Story = {
  args: {
    children: "Floating Status",
    tone: "neutral",
  },
};

export const AllTones: Story = {
  render: () => {
    const badges: Array<
      Required<Pick<VerdantScholarBadgeProps, "tone">> & { label: string }
    > = [
      { label: "Primary", tone: "primary" },
      { label: "Neutral", tone: "neutral" },
      { label: "Tertiary", tone: "tertiary" },
      { label: "Success", tone: "success" },
      { label: "Danger", tone: "danger" },
    ];

    return (
      <div className="flex flex-wrap gap-3">
        {badges.map((badge) => (
          <VerdantScholarBadge key={badge.label} tone={badge.tone}>
            {badge.label}
          </VerdantScholarBadge>
        ))}
      </div>
    );
  },
};
