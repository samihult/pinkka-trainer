import type { Meta, StoryObj } from "@storybook/react";

import { PinkkaGroupItem } from "@/components/pinkka/pinkka-group-item";
import type { PinkkaGroup } from "@/lib/pinkka/pinkka-api";

const sampleGroup: PinkkaGroup = {
  id: 42,
  name: { fi: "Kasviryhmat", en: "Plant groups", sv: "Vaxtgrupper" },
  description: { fi: "Pohjoismaista kasvistoa." },
  hideScientific: false,
  hideVernacular: false,
  published: true,
  entityType: "pinkka",
};

const meta: Meta<typeof PinkkaGroupItem> = {
  title: "Components/Pinkka/PinkkaGroupItem",
  component: PinkkaGroupItem,
  args: {
    group: sampleGroup,
    preferredLang: "fi",
  },
};

export default meta;

type Story = StoryObj<typeof PinkkaGroupItem>;

export const Default: Story = {};
