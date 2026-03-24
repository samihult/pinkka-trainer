/** Storybook stories for Verdant Scholar animated atmospheric background containers. */
import type { Meta, StoryObj } from "@storybook/react";

import {
  VerdantScholarAtmosphereContainer,
  type VerdantScholarAtmosphereContainerProps,
} from "./atmosphere-container";
import { withVerdantScholarTheme } from "../storybook-utils";

function AtmosphereDemo(args: VerdantScholarAtmosphereContainerProps) {
  return (
    <VerdantScholarAtmosphereContainer
      {...args}
      className="h-[26rem] rounded-[var(--vs-radius-xl)]"
      contentClassName="flex h-full items-end p-6 sm:p-8"
    >
      <div className="max-w-md rounded-[var(--vs-radius-lg)] bg-white/55 p-5 text-[var(--vs-color-on-surface)] shadow-[var(--vs-shadow-ambient)] backdrop-blur-md">
        <p className="text-[length:var(--vs-font-label-sm)] font-semibold uppercase tracking-[0.18em] text-[var(--vs-color-primary)]">
          Atmosphere Preview
        </p>
        <h3 className="mt-2 text-[length:var(--vs-font-headline-md)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
          {args.variant}
        </h3>
        <p className="mt-2 text-[length:var(--vs-font-body-md)] text-[var(--vs-color-on-surface-variant)]">
          Generic container wrapper with animated layers from the Stitch habitat
          backgrounds.
        </p>
      </div>
    </VerdantScholarAtmosphereContainer>
  );
}

const meta = {
  title: "Verdant Scholar/Atoms/Atmosphere Container",
  component: VerdantScholarAtmosphereContainer,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    variant: "subarctic-dawn",
  },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["subarctic-dawn", "deep-forest-canopy", "misty-marshland"],
    },
  },
  render: (args) => <AtmosphereDemo {...args} />,
} satisfies Meta<typeof VerdantScholarAtmosphereContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SubarcticDawn: Story = {
  args: {
    variant: "subarctic-dawn",
  },
};

export const DeepForestCanopy: Story = {
  args: {
    variant: "deep-forest-canopy",
  },
};

export const MistyMarshland: Story = {
  args: {
    variant: "misty-marshland",
  },
};

export const CustomFraming: Story = {
  render: () => (
    <div className="grid gap-6 sm:grid-cols-2">
      <VerdantScholarAtmosphereContainer
        variant="subarctic-dawn"
        className="relative h-44 rounded-none"
      />
      <VerdantScholarAtmosphereContainer
        variant="deep-forest-canopy"
        className="relative -mt-2 h-52 rounded-[2rem]"
      />
    </div>
  ),
};
