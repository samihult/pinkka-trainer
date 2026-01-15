import type { Meta, StoryObj } from "@storybook/react";

import { SpeciesImageCarousel } from "@/components/species-image-carousel";
import type { SpeciesImage } from "@/lib/types";

const sampleImages: SpeciesImage[] = [
  {
    id: "img-1",
    urls: {
      full: "/placeholder.jpg",
      large: "/placeholder.jpg",
    },
  },
  {
    id: "img-2",
    urls: {
      full: "/placeholder-logo.png",
    },
  },
  {
    id: "img-3",
    urls: {
      full: "/placeholder-logo.svg",
    },
  },
];

const meta: Meta<typeof SpeciesImageCarousel> = {
  title: "Components/SpeciesImageCarousel",
  component: SpeciesImageCarousel,
  args: {
    images: sampleImages,
    alt: "Species image",
    heightClassName: "h-[360px]",
  },
};

export default meta;

type Story = StoryObj<typeof SpeciesImageCarousel>;

export const Default: Story = {
  render: (args) => (
    <div className="max-w-2xl">
      <SpeciesImageCarousel {...args} />
    </div>
  ),
};

export const NoImages: Story = {
  args: {
    images: [],
  },
  render: (args) => (
    <div className="max-w-2xl">
      <SpeciesImageCarousel {...args} />
    </div>
  ),
};
