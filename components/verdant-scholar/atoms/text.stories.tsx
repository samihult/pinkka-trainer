/** Storybook stories for the Verdant Scholar text atoms. */
import type { Meta, StoryObj } from "@storybook/react";

import { withVerdantScholarTheme } from "../storybook-utils";
import { VerdantScholarHeading, VerdantScholarText } from "./text";

const meta = {
  title: "Verdant Scholar/Atoms/Text",
  component: VerdantScholarText,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof VerdantScholarText>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Reference: Story = {
  render: () => (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <VerdantScholarText tone="primary" variant="eyebrow">
          Eyebrow
        </VerdantScholarText>
        <VerdantScholarHeading variant="display">
          Display Heading
        </VerdantScholarHeading>
        <VerdantScholarHeading variant="headline">
          Section headline
        </VerdantScholarHeading>
        <VerdantScholarHeading variant="subheadline">
          Subheadline
        </VerdantScholarHeading>
      </div>
      <div className="space-y-3">
        <VerdantScholarText>
          Body text carries the default editorial reading style.
        </VerdantScholarText>
        <VerdantScholarText tone="muted" variant="body-lg">
          Large body text supports intros and lead paragraphs.
        </VerdantScholarText>
        <VerdantScholarText tone="muted" variant="meta">
          Meta text supports secondary details and compact descriptions.
        </VerdantScholarText>
        <VerdantScholarText variant="label">Label</VerdantScholarText>
        <VerdantScholarText tone="muted" variant="italic">
          Scientific or editorial italic text.
        </VerdantScholarText>
      </div>
    </div>
  ),
};
