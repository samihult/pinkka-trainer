/** Storybook stories for the Verdant Scholar fact-card molecule. */
import type { Meta, StoryObj } from "@storybook/react";
import { Leaf, Microscope } from "lucide-react";

import { VerdantScholarFactCard } from "./fact-card";
import { withVerdantScholarTheme } from "../storybook-utils";

const meta = {
  title: "Verdant Scholar/Molecules/Fact Card",
  component: VerdantScholarFactCard,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    title: "Morphology",
    icon: <Microscope className="size-5 text-[var(--vs-color-primary)]" />,
    rows: [
      { label: "Adult Weight", value: "150 - 250 kg" },
      { label: "Body Length", value: "1.7 - 2.5 m" },
    ],
    tone: "surface",
  },
  argTypes: {
    icon: { control: false },
    rows: { control: false },
    summary: { control: false },
  },
} satisfies Meta<typeof VerdantScholarFactCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Surface: Story = {};

export const SoftInsight: Story = {
  args: {
    title: "Taxonomic Insight",
    icon: <Leaf className="size-5 text-[var(--vs-color-primary)]" />,
    rows: undefined,
    summary:
      "The Ericaceae family is distinguished by urceolate floral structures and the specific leaf venation typical of high-altitude species.",
    tone: "soft",
  },
};

export const Accent: Story = {
  args: {
    title: "Global Mastery",
    icon: <Microscope className="size-5 text-[var(--vs-color-on-primary)]" />,
    rows: [
      { label: "Curator Rank", value: "Rank 8" },
      { label: "XP Earned", value: "1,240" },
    ],
    tone: "accent",
  },
};
