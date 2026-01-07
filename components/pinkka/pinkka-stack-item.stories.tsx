import type { Meta, StoryObj } from "@storybook/react";

import { PinkkaStackItem } from "@/components/pinkka/pinkka-stack-item";
import type { PinkkaSubStack } from "@/lib/pinkka/pinkka-api";

const sampleStack: PinkkaSubStack = {
  id: 128,
  name: { fi: "Abies-Allium", en: "Abies-Allium", sv: "Abies-Allium" },
  orderNo: 1,
  description: { fi: "Lajit A:sta A:han." },
  entityType: "subpinkka",
};

const meta: Meta<typeof PinkkaStackItem> = {
  title: "Components/Pinkka/PinkkaStackItem",
  component: PinkkaStackItem,
  args: {
    stack: sampleStack,
    preferredLang: "fi",
  },
};

export default meta;

type Story = StoryObj<typeof PinkkaStackItem>;

export const Default: Story = {};
