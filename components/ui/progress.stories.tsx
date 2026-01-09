import type { Meta, StoryObj } from "@storybook/react";

import { Progress } from "./progress";

const meta: Meta<typeof Progress> = {
  title: "UI/Progress",
  component: Progress,
  args: {
    value: 62,
  },
};

export default meta;

type Story = StoryObj<typeof Progress>;

export const Default: Story = {
  render: (args) => (
    <div className="max-w-sm">
      <Progress {...args} />
    </div>
  ),
};
