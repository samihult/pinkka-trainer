import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "./button";
import { Toaster } from "./toaster";
import { toast } from "@/hooks/use-toast";

const meta: Meta<typeof Toaster> = {
  title: "UI/Toaster",
  component: Toaster,
};

export default meta;

type Story = StoryObj<typeof Toaster>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button
        onClick={() =>
          toast({
            title: "Toast from Storybook",
            description: "This is a sample notification.",
          })
        }
      >
        Show toast
      </Button>
      <Toaster />
    </div>
  ),
};
