import type { Meta, StoryObj } from "@storybook/react";

import { Flashcard } from "./flashcard";
import type { Species } from "@/lib/types";

const baseSpecies: Species = {
  id: "species-1",
  scientificName: "Vulpes vulpes",
  finnishName: "Red fox",
  englishName: "Red Fox",
  description:
    "A small, adaptable canid found across the northern hemisphere.",
  images: [
    {
      id: "img-1",
      url: "/placeholder.jpg",
      order: 0,
    },
  ],
  stackId: "stack-1",
  createdBy: "storybook",
  createdAt: new Date(),
  updatedAt: new Date(),
  order: 1,
};

const meta: Meta<typeof Flashcard> = {
  title: "Components/Flashcard",
  component: Flashcard,
  args: {
    species: baseSpecies,
    currentIndex: 0,
    total: 5,
    onNext: () => {},
    onPrevious: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof Flashcard>;

export const Default: Story = {};

export const MultipleImages: Story = {
  args: {
    species: {
      ...baseSpecies,
      images: [
        { id: "img-1", url: "/placeholder.jpg", order: 0 },
        { id: "img-2", url: "/placeholder-logo.png", order: 1 },
        { id: "img-3", url: "/placeholder-logo.svg", order: 2 },
      ],
    },
  },
};
