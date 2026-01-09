import type { Meta, StoryObj } from "@storybook/react";
import type { ComponentProps } from "react";

import { MiddleEllipsisText } from "./middle-ellipsis-text";

type MiddleEllipsisTextProps = ComponentProps<typeof MiddleEllipsisText>;

const meta: Meta<typeof MiddleEllipsisText> = {
  title: "Components/MiddleEllipsisText",
  component: MiddleEllipsisText,
  args: {
    text: "Abies alba var. alpina (Silver fir, mountain form)",
  },
  render: (args: MiddleEllipsisTextProps) => (
    <div className="max-w-[240px] rounded-md border bg-card px-3 py-2 text-sm">
      <MiddleEllipsisText {...args} />
    </div>
  ),
};

export default meta;

type Story = StoryObj<typeof MiddleEllipsisText>;

export const Short: Story = {
  args: {
    text: "Abies alba",
  },
};

export const Long: Story = {
  args: {
    text: "A long botanical name that should collapse into a middle ellipsis",
  },
};
