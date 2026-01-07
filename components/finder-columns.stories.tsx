import type { Meta, StoryObj } from "@storybook/react";

import { FinderColumns, type FinderItem } from "./finder-columns";

type DemoPayload = {
  name: string;
  description?: string;
};

const groupItems: FinderItem<DemoPayload>[] = [
  { id: 1, type: "group", payload: { name: "Nordic flora" } },
  { id: 2, type: "group", payload: { name: "Bryophytes and lichens" } },
  { id: 3, type: "group", payload: { name: "Aquatic life" } },
];

const stacksByGroup: Record<number, FinderItem<DemoPayload>[]> = {
  1: [
    { id: 101, type: "stack", payload: { name: "Abies-Allium" } },
    { id: 102, type: "stack", payload: { name: "Carex" } },
    { id: 103, type: "stack", payload: { name: "Saxifraga-Silene" } },
  ],
  2: [
    { id: 201, type: "stack", payload: { name: "Abietinella-Calypogeia" } },
    { id: 202, type: "stack", payload: { name: "Campylium" } },
    { id: 203, type: "stack", payload: { name: "Cladonia" } },
  ],
  3: [
    { id: 301, type: "stack", payload: { name: "Kasviplankton" } },
    { id: 302, type: "stack", payload: { name: "Elainplankton" } },
  ],
};

const speciesByStack: Record<number, FinderItem<DemoPayload>[]> = {
  101: [
    { id: 1001, type: "species", payload: { name: "Abies alba" } },
    { id: 1002, type: "species", payload: { name: "Allium ursinum" } },
  ],
  102: [
    { id: 1101, type: "species", payload: { name: "Carex nigra" } },
    { id: 1102, type: "species", payload: { name: "Carex rostrata" } },
  ],
  201: [
    { id: 2001, type: "species", payload: { name: "Abietinella abietina" } },
  ],
  301: [
    { id: 3001, type: "species", payload: { name: "Chroococcus" } },
  ],
};

const meta: Meta<typeof FinderColumns> = {
  title: "Components/FinderColumns",
  component: FinderColumns,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj<typeof FinderColumns>;

export const Default: Story = {
  render: () => (
    <div className="h-[520px] border border-border bg-background">
      <FinderColumns
        rootItems={groupItems}
        columnOrder={["group", "stack", "species"]}
        typeConfigs={{
          group: {
            columnTitle: "Groups",
            columnClassName: "bg-muted/20",
            renderItem: (item) => <div>{item.payload.name}</div>,
            loadChildren: async (item) =>
              stacksByGroup[item.id as number] ?? [],
            noSelectionMessage: "Select a group to view stacks.",
            multiSelectMessage: "Multiple groups selected.",
          },
          stack: {
            columnTitle: "Stacks",
            renderItem: (item) => <div>{item.payload.name}</div>,
            loadChildren: async (item) =>
              speciesByStack[item.id as number] ?? [],
            noSelectionMessage: "Select a stack to view species.",
            multiSelectMessage: "Multiple stacks selected.",
          },
          species: {
            columnTitle: "Species",
            columnClassName: "bg-muted/10",
            renderItem: (item) => <div>{item.payload.name}</div>,
          },
        }}
        renderTrailing={({ activeItem }) => (
          <div className="flex min-w-[260px] flex-1 flex-col bg-background">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Details
            </div>
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {activeItem
                ? `Selected ${activeItem.type}: ${activeItem.payload.name}`
                : "Select an item to preview details."}
            </div>
          </div>
        )}
      />
    </div>
  ),
};
