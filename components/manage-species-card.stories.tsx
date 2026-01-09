import type { Meta, StoryObj } from "@storybook/react";

import { ManageSpeciesCardHorizontalContent } from "./manage-species-card-horizontal-content";
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
  createdAt: new Date("2024-01-01T12:00:00.000Z"),
  updatedAt: new Date("2024-01-01T12:00:00.000Z"),
};

const meta: Meta<typeof ManageSpeciesCardHorizontalContent> = {
  title: "Components/ManageSpeciesCardHorizontalContent",
  component: ManageSpeciesCardHorizontalContent,
  args: {
    species: exampleSpecies,
    onEdit: (species) => {
      console.log("edit", species.id);
    },
    onDelete: (id) => {
      console.log("delete", id);
    },
  },
  render: (args) => (
    <div className="max-w-2xl">
      <ManageSpeciesCardHorizontalContent {...args} />
    </div>
  ),
};

export default meta;

type Story = StoryObj<typeof ManageSpeciesCardHorizontalContent>;

export const Default: Story = {};
