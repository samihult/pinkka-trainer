import type { Meta, StoryObj } from "@storybook/react";

import { PinkkaExplorer } from "./pinkka-explorer";
import type {
  PinkkaGroup,
  PinkkaSpeciesDetail,
  PinkkaSubStack,
} from "@/lib/pinkka/pinkka-api";

const groups: PinkkaGroup[] = [
  {
    id: 1,
    name: { fi: "Metsä", en: "Forest" },
    description: { fi: "Havumetsien lajit" },
    hideScientific: false,
    hideVernacular: false,
    published: true,
    entityType: "Pinkka",
  },
  {
    id: 2,
    name: { fi: "Vesistöt", en: "Freshwater" },
    description: { fi: "Järvien ja jokien lajit" },
    hideScientific: false,
    hideVernacular: false,
    published: true,
    entityType: "Pinkka",
  },
];

const subStacksByGroup: Record<number, PinkkaSubStack[]> = {
  1: [
    {
      id: 11,
      name: { fi: "Nisäkkäät", en: "Mammals" },
      orderNo: 1,
      description: { fi: "Suomen tutut nisäkkäät" },
      entityType: "SubPinkka",
    },
    {
      id: 12,
      name: { fi: "Linnut", en: "Birds" },
      orderNo: 2,
      description: { fi: "Metsälintujen parhaimmisto" },
      entityType: "SubPinkka",
    },
  ],
  2: [
    {
      id: 21,
      name: { fi: "Kalalajit", en: "Fish" },
      orderNo: 1,
      description: { fi: "Järvikalat" },
      entityType: "SubPinkka",
    },
  ],
};

const speciesBySubStack: Record<number, PinkkaSubStack> = {
  11: {
    id: 11,
    name: { fi: "Nisäkkäät", en: "Mammals" },
    orderNo: 1,
    entityType: "SubPinkka",
    speciesCards: [
      {
        id: 1101,
        taxonId: "MX.1",
        scientificName: "Vulpes vulpes",
        vernacularName: { fi: "Kettu", en: "Red fox" },
        entityType: "SpeciesCard",
      },
      {
        id: 1102,
        taxonId: "MX.2",
        scientificName: "Ursus arctos",
        vernacularName: { fi: "Karhu", en: "Brown bear" },
        entityType: "SpeciesCard",
      },
    ],
  },
  12: {
    id: 12,
    name: { fi: "Linnut", en: "Birds" },
    orderNo: 2,
    entityType: "SubPinkka",
    speciesCards: [
      {
        id: 1201,
        taxonId: "BR.1",
        scientificName: "Lagopus lagopus",
        vernacularName: { fi: "Riekko", en: "Willow ptarmigan" },
        entityType: "SpeciesCard",
      },
    ],
  },
  21: {
    id: 21,
    name: { fi: "Kalalajit", en: "Fish" },
    orderNo: 1,
    entityType: "SubPinkka",
    speciesCards: [
      {
        id: 2101,
        taxonId: "FS.1",
        scientificName: "Esox lucius",
        vernacularName: { fi: "Hauki", en: "Northern pike" },
        entityType: "SpeciesCard",
      },
    ],
  },
};

const speciesDetails: Record<number, PinkkaSpeciesDetail> = {
  1101: {
    taxonId: "MX.1",
    scientificName: "Vulpes vulpes",
    vernacularName: { fi: "Kettu", en: "Red fox" },
    description: [
      {
        title: { fi: "Tuntomerkit", en: "Identification" },
        body: {
          fi: "Kettumainen kuono ja tuuhea häntä.",
          en: "Pointed muzzle with a bushy tail.",
        },
        predicate: "identification",
      },
    ],
  },
  1102: {
    taxonId: "MX.2",
    scientificName: "Ursus arctos",
    vernacularName: { fi: "Karhu", en: "Brown bear" },
    description: [
      {
        title: { fi: "Elinympäristö", en: "Habitat" },
        body: {
          fi: "Havumetsät ja suot.",
          en: "Coniferous forests and wetlands.",
        },
        predicate: "habitat",
      },
    ],
  },
  1201: {
    taxonId: "BR.1",
    scientificName: "Lagopus lagopus",
    vernacularName: { fi: "Riekko", en: "Willow ptarmigan" },
    description: [
      {
        title: { fi: "Elintavat", en: "Behavior" },
        body: {
          fi: "Viihtyy pensaikoissa ja tundralla.",
          en: "Prefers shrubs and tundra.",
        },
        predicate: "behavior",
      },
    ],
  },
  2101: {
    taxonId: "FS.1",
    scientificName: "Esox lucius",
    vernacularName: { fi: "Hauki", en: "Northern pike" },
    description: [
      {
        title: { fi: "Ruokavalio", en: "Diet" },
        body: {
          fi: "Petokala, joka saalistaa pienempiä kaloja.",
          en: "Predatory fish that hunts smaller fish.",
        },
        predicate: "diet",
      },
    ],
  },
};

const meta: Meta<typeof PinkkaExplorer> = {
  title: "Components/PinkkaExplorer",
  component: PinkkaExplorer,
  args: {
    preferredLang: "fi",
    api: {
      fetchGroups: async () => groups,
      fetchGroupWithStacks: async (groupId: number) => ({
        ...groups.find((group) => group.id === groupId)!,
        subPinkkas: subStacksByGroup[groupId] ?? [],
      }),
      fetchSubStack: async (subStackId: number) =>
        speciesBySubStack[subStackId] ?? null,
      fetchSpecies: async (speciesId: number) =>
        speciesDetails[speciesId] ?? null,
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-5xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof PinkkaExplorer>;

export const FinderMode: Story = {};
