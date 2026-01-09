import type { Meta, StoryFn, StoryObj } from "@storybook/react";

import { PinkkaExplorer } from "./pinkka-explorer";
import { pinkkaHandlers } from "@/stories/mocks/pinkka-handlers";

const meta: Meta<typeof PinkkaExplorer> = {
  title: "Components/Pinkka/PinkkaExplorer",
  component: PinkkaExplorer,
  args: {
    preferredLang: "fi",
  },
  decorators: [
    (Story: StoryFn) => (
      <div className="h-96">
        <Story />
      </div>
    ),
  ],
  parameters: {
    msw: {
      handlers: pinkkaHandlers,
    },
  },
};

export default meta;

type Story = StoryObj<typeof PinkkaExplorer>;

export const FinderMode: Story = {};
