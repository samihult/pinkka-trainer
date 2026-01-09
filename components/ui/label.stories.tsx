import type { Meta, StoryObj } from "@storybook/react";

import { Input } from "./input";
import { Label } from "./label";

const meta: Meta<typeof Label> = {
  title: "UI/Label",
  component: Label,
};

export default meta;

type Story = StoryObj<typeof Label>;

export const Default: Story = {
  render: () => (
    <div className="max-w-sm space-y-2">
      <Label htmlFor="species-name">Species name</Label>
      <Input id="species-name" placeholder="Vulpes vulpes" />
    </div>
  ),
};
