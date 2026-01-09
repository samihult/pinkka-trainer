import type { Meta, StoryObj } from "@storybook/react";

import { SpeciesForm } from "./species-form";
import type { Species } from "@/lib/types";
import type { PinkkaSpeciesDetail } from "@/lib/pinkka/pinkka-api";

const meta: Meta<typeof SpeciesForm> = {
  title: "Components/SpeciesForm",
  component: SpeciesForm,
  args: {
    stackId: "storybook-stack",
    onSubmit: async (data: PinkkaSpeciesDetail) => {
      console.log("SpeciesForm submit", data);
    },
    onCancel: () => {
      console.log("SpeciesForm cancel");
    },
  },
};

export default meta;

type Story = StoryObj<typeof SpeciesForm>;

export const Create: Story = {};

const exampleSpecies: Species = {
  id: "species-1",
  data: {
    taxonId: "taxon-1",
    scientificName: "Vulpes vulpes",
    vernacularName: {
      fi: "Kettu",
      en: "Red Fox",
    },
    description: [
      {
        title: { fi: "Description" },
        body: {
          fi: "A small, adaptable canid found across the northern hemisphere.",
        },
        predicate: "description",
      },
    ],
    images: [
      {
        id: "img-1",
        urls: {
          full: "https://placehold.co/640x480/png",
          large: "https://placehold.co/640x480/png",
        },
      },
    ],
  },
  ownerId: "storybook-user",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const Edit: Story = {
  args: {
    species: exampleSpecies,
  },
};
