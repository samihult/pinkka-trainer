/** Storybook overview for the Verdant Scholar molecule gallery. */
import type { Meta, StoryObj } from "@storybook/react";
import { Leaf, Microscope } from "lucide-react";

import { VerdantScholarAnswerOption } from "./molecules/answer-option";
import { VerdantScholarFactCard } from "./molecules/fact-card";
import { VerdantScholarFeatureTile } from "./molecules/feature-tile";
import { VerdantScholarFilterGroup } from "./molecules/filter-group";
import { VerdantScholarPopupMenu } from "./molecules/popup-menu";
import { VerdantScholarSectionHeading } from "./molecules/section-heading";
import { VerdantScholarSpecimenCard } from "./molecules/specimen-card";
import { VerdantScholarStackCard } from "./molecules/stack-card";
import { VerdantScholarTheme } from "./verdant-scholar-theme";

const meta: Meta = {
  title: "Verdant Scholar/Molecules/Overview",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};

export default meta;

type Story = StoryObj;

export const Gallery: Story = {
  name: "Gallery",
  render: () => (
    <VerdantScholarTheme className="space-y-10">
      <VerdantScholarSectionHeading
        eyebrow="Molecules"
        title="Archive cards, filters, and structured content"
        description="These mid-level patterns are the building blocks used by the full-screen Verdant Scholar layouts."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <VerdantScholarSpecimenCard
          title="Scarlet Macaw"
          scientificName="Ara macao"
          taxonomy="Psittaciformes"
          status="LC · Least Concern"
          imageAlt="Scarlet Macaw"
          imageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuBBdYg6ph7VBO_IXe0jMfCC2cJssf-Y0q62_ibR87RY9bQ06vvvLXfMCpvFlAWwrd_hg4IVMC-t0G1JGevKCUQLKYynTCU6jI3f0vai0MDW7bskjLayE_8YSlETT9NeHMj2vi380_F4A4M8Zjpo5h3Xg-VkFTWCUG02SEIflSrR90xD97HXBjwB9npRZ01AdYv2Oi2NfJWMXGad3bTumbF5Hdkloy8qOZkyR49gVO1Z-kqNwDq7MrGXpcpmfMysFcPWX_ScQGE1VnQ"
        />
        <VerdantScholarFeatureTile
          title="Flora"
          description="From ancient bryophytes to complex angiosperms, explore the foundation of ecosystems."
          ctaLabel="Explore Plants"
          emphasis="hero"
          imageAlt="Forest plants"
          imageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuBpMS0KDxV8nZZIeWCXxlm94luTwXUXbahJ8rWk-fo7Lrxm7jrKsiwp9X-od_s5KfPXl9RobpRNDOJU6IYi-5igO0CBAq3mddkV9j6KyvudYlBdW2BklD4pWU3eO7qEp2lzZ140ykMW14Aa6-r5csvFHoGSnQb6aVGPNkzblicldn095OnuGoJga5DyHQEPu6kVihcViHVhjo1r-pvfAYoryT7idOfTe6HcU0DVyYrR8_y-0ISZ6Ln6cKmn_giWvxOjyighg3qpkb8"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <VerdantScholarFilterGroup
          title="Taxonomy"
          variant="checkboxes"
          items={[
            { label: "Mammalia" },
            { label: "Aves", selected: true },
            { label: "Reptilia" },
          ]}
        />
        <VerdantScholarFactCard
          title="Morphology"
          icon={
            <Microscope className="size-5 text-[var(--vs-color-primary)]" />
          }
          rows={[
            { label: "Adult Weight", value: "150 - 250 kg" },
            { label: "Body Length", value: "1.7 - 2.5 m" },
          ]}
        />
        <VerdantScholarStackCard
          title="Subarctic Habitats"
          description="Lichen, mosses, and dwarf shrubs adapted to permafrost environments."
          eyebrow="A+"
          meta="12 specimens · 30% complete"
          actionLabel="Resume Stack"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <VerdantScholarFactCard
          title="Selector"
          summary="Popup menus carry the same warm editorial surfaces while keeping keyboard focus and selected-state clarity."
          tone="soft"
        />
        <VerdantScholarPopupMenu
          items={[
            {
              id: "1",
              label: "Asplenium viride",
              description: "viherraunioinen",
              leading: <span className="text-xs font-semibold">1</span>,
            },
            {
              id: "2",
              label: "Botrychium boreale",
              description: "pohjannoidanlukko",
              leading: <span className="text-xs font-semibold">2</span>,
            },
            {
              id: "3",
              label: "Dryopteris expansa",
              description: "isoalvejuuri",
              leading: <span className="text-xs font-semibold">3</span>,
            },
          ]}
          label="2 / 3"
          selectedItemId="2"
          triggerAriaLabel="Open specimen jump menu"
        />
        <VerdantScholarSectionHeading
          eyebrow="Interaction"
          title="Popup menus"
          description="Use them for jump lists, archive views, or compact control clusters when the interface needs quick selection without losing the Verdant Scholar mood."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <VerdantScholarAnswerOption
            optionKey="A"
            label="Melastomataceae"
            state="incorrect"
          />
          <VerdantScholarAnswerOption
            optionKey="C"
            label="Ericaceae"
            state="correct"
            suffix="Correct Specimen"
          />
        </div>
        <VerdantScholarFactCard
          title="Taxonomic Insight"
          icon={<Leaf className="size-5 text-[var(--vs-color-primary)]" />}
          summary="The Ericaceae family is distinguished by urceolate floral structures and the specific leaf venation typical of high-altitude species."
          tone="soft"
        />
      </div>
    </VerdantScholarTheme>
  ),
};
