import type { Meta, StoryObj } from "@storybook/react";

import { PinkkaSpeciesDetail } from "@/components/pinkka/pinkka-species-detail";
import type { PinkkaSpeciesDetail as PinkkaSpeciesDetailPayload } from "@/lib/pinkka/pinkka-api";

const sampleDetail: PinkkaSpeciesDetailPayload = {
  taxonId: "MX.2",
  scientificName: "Betula pendula",
  vernacularName: { fi: "Rauduskoivu", en: "Silver birch" },
  description: [
    {
      predicate: "habitat",
      title: { fi: "Kasvupaikka", en: "Habitat" },
      body: {
        fi: "Valoisat metsat ja <strong>harjut</strong>.",
        en: "Sunny forests and <em>ridges</em>.",
      },
    },
  ],
};

const meta: Meta<typeof PinkkaSpeciesDetail> = {
  title: "Components/Pinkka/PinkkaSpeciesDetail",
  component: PinkkaSpeciesDetail,
  args: {
    detail: sampleDetail,
    preferredLang: "fi",
  },
};

export default meta;

type Story = StoryObj<typeof PinkkaSpeciesDetail>;

export const Default: Story = {};
