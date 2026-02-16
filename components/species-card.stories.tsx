import type { Meta, StoryObj } from "@storybook/react";

import { SpeciesCard } from "./species-card";
import type { Species } from "@/lib/types";

const baseSpecies: Species = {
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
          full: "/placeholder.jpg",
          large: "/placeholder.jpg",
        },
      },
    ],
  },
  ownerId: "storybook",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const meta: Meta<typeof SpeciesCard> = {
  title: "Components/SpeciesCard",
  component: SpeciesCard,
  decorators: [
    (Story) => (
      <div className="h-[680px] w-full bg-background p-6">
        <Story />
      </div>
    ),
  ],
  args: {
    species: baseSpecies,
    currentIndex: 0,
    total: 5,
    onNext: () => {},
    onPrevious: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof SpeciesCard>;

export const Default: Story = {};

export const MultipleImages: Story = {
  args: {
    species: {
      ...baseSpecies,
      data: {
        ...baseSpecies.data,
        images: [
          { id: "img-1", urls: { full: "/placeholder.jpg" } },
          { id: "img-2", urls: { full: "/placeholder-logo.png" } },
          { id: "img-3", urls: { full: "/placeholder-logo.svg" } },
        ],
      },
    },
  },
};
