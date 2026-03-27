/** Storybook stories for the Verdant Scholar card atom family. */
import type { Meta, StoryObj } from "@storybook/react";
import { ArrowRight } from "lucide-react";

import { withVerdantScholarTheme } from "../storybook-utils";
import {
  VerdantScholarCard,
  VerdantScholarCardAction,
  VerdantScholarCardContent,
  VerdantScholarCardDescription,
  VerdantScholarCardFooter,
  VerdantScholarCardHeader,
  VerdantScholarCardTitle,
} from "./card";
import { VerdantScholarButton } from "./button";
import { VerdantScholarText } from "./text";

const meta = {
  title: "Verdant Scholar/Atoms/Card",
  component: VerdantScholarCard,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    tone: "surface",
  },
  render: (args) => (
    <div className="max-w-lg">
      <VerdantScholarCard {...args}>
        <VerdantScholarCardHeader>
          <VerdantScholarCardTitle>Editorial Surface</VerdantScholarCardTitle>
          <VerdantScholarCardDescription>
            Shared card primitives for Verdant Scholar molecules and organisms.
          </VerdantScholarCardDescription>
          <VerdantScholarCardAction>
            <VerdantScholarButton size="sm" variant="secondary">
              Inspect
            </VerdantScholarButton>
          </VerdantScholarCardAction>
        </VerdantScholarCardHeader>
        <VerdantScholarCardContent>
          <VerdantScholarText tone="muted">
            The card atom wraps the shared shadcn card primitives and applies
            the Verdant Scholar tonal system.
          </VerdantScholarText>
        </VerdantScholarCardContent>
        <VerdantScholarCardFooter className="justify-between">
          <VerdantScholarText tone="muted" variant="label">
            Surface Tone
          </VerdantScholarText>
          <VerdantScholarButton
            size="sm"
            trailingIcon={<ArrowRight className="size-4" />}
          >
            Continue
          </VerdantScholarButton>
        </VerdantScholarCardFooter>
      </VerdantScholarCard>
    </div>
  ),
} satisfies Meta<typeof VerdantScholarCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Surface: Story = {};

export const Glass: Story = {
  args: {
    tone: "glass",
  },
};

export const Accent: Story = {
  args: {
    tone: "accent",
  },
};
