/** Storybook stories for the Verdant Scholar section-heading molecule. */
import type { Meta, StoryObj } from "@storybook/react";
import { ArrowRight } from "lucide-react";

import { VerdantScholarButton } from "../atoms/button";
import { VerdantScholarSectionHeading } from "./section-heading";
import { withVerdantScholarTheme } from "../storybook-utils";

const meta = {
  title: "Verdant Scholar/Molecules/Section Heading",
  component: VerdantScholarSectionHeading,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    eyebrow: "Molecules",
    title: "Archive cards, filters, and structured content",
    description:
      "These mid-level patterns are the building blocks used by the full-screen Verdant Scholar layouts.",
  },
  argTypes: {
    action: { control: false },
    description: { control: false },
    eyebrow: { control: false },
    title: { control: false },
  },
} satisfies Meta<typeof VerdantScholarSectionHeading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Standard: Story = {};

export const WithAction: Story = {
  args: {
    action: (
      <VerdantScholarButton
        size="sm"
        trailingIcon={<ArrowRight className="size-4" />}
      >
        Browse Collection
      </VerdantScholarButton>
    ),
  },
};

export const Minimal: Story = {
  args: {
    description: undefined,
    eyebrow: undefined,
    title: "Section Heading Only",
  },
};
