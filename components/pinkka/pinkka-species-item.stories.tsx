import type { Meta, StoryObj } from "@storybook/react";

import { PinkkaSpeciesItem } from "@/components/pinkka/pinkka-species-item";
import type { PinkkaSpeciesCard } from "@/lib/pinkka/pinkka-api";

const sampleSpecies: PinkkaSpeciesCard = {
  id: 9001,
  taxonId: "MX.1",
  scientificName: "Anemone nemorosa",
  vernacularName: { fi: "Valkovuokko", en: "Wood anemone" },
  entityType: "speciescard",
};

const meta: Meta<typeof PinkkaSpeciesItem> = {
  title: "Components/Pinkka/PinkkaSpeciesItem",
  component: PinkkaSpeciesItem,
  args: {
    species: sampleSpecies,
    preferredLang: "fi",
  },
};

export default meta;

type Story = StoryObj<typeof PinkkaSpeciesItem>;

export const Default: Story = {};
