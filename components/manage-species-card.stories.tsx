import type { Meta, StoryObj } from "@storybook/react";

import { ManageSpeciesCard } from "./manage-species-card";
import type { Species } from "@/lib/types";

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
        body: { fi: "A small, adaptable canid found across the northern hemisphere." },
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
  createdAt: new Date("2024-01-01T12:00:00.000Z"),
  updatedAt: new Date("2024-01-01T12:00:00.000Z"),
};

const meta: Meta<typeof ManageSpeciesCard> = {
  title: "Components/ManageSpeciesCard",
  component: ManageSpeciesCard,
  args: {
    species: exampleSpecies,
    index: 0,
    onDragStart: (index) => {
      console.log("drag start", index);
    },
    onDragOver: (event, index) => {
      event.preventDefault();
      console.log("drag over", index);
    },
    onDragEnd: () => {
      console.log("drag end");
    },
    onEdit: (species) => {
      console.log("edit", species.id);
    },
    onDelete: (id) => {
      console.log("delete", id);
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ManageSpeciesCard>;

export const Default: Story = {};
