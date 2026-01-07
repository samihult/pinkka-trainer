import type { Meta, StoryObj } from "@storybook/react";

import { SpeciesForm } from "./species-form";
import type { Species } from "@/lib/types";

const meta: Meta<typeof SpeciesForm> = {
  title: "Components/SpeciesForm",
  component: SpeciesForm,
  args: {
    stackId: "storybook-stack",
    onSubmit: async (data) => {
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
  scientificName: "Vulpes vulpes",
  finnishName: "Kettu",
  englishName: "Red Fox",
  description:
    "A small, adaptable canid found across the northern hemisphere.",
  images: [
    {
      id: "img-1",
      url: "https://placehold.co/640x480/png",
      order: 0,
    },
  ],
  stackId: "storybook-stack",
  createdBy: "storybook-user",
  createdAt: new Date(),
  updatedAt: new Date(),
  order: 1,
};

export const Edit: Story = {
  args: {
    species: exampleSpecies,
  },
};
