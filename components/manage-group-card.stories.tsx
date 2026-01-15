import type { Meta, StoryObj } from "@storybook/react";

import { ManageGroupCard } from "@/components/manage-group-card";
import type { Group, Stack } from "@/lib/types";

const exampleGroup: Group = {
  id: "group-1",
  data: {
    id: 101,
    name: { fi: "Woodland Mammals" },
    description: { fi: "Stacks for forest-dwelling mammals." },
    hideScientific: false,
    hideVernacular: false,
    published: true,
    entityType: "pinkka",
  },
  stackIds: ["stack-1", "stack-2", "stack-3"],
  ownerId: "storybook-user",
  createdAt: new Date("2024-01-01T12:00:00.000Z"),
  updatedAt: new Date("2024-01-01T12:00:00.000Z"),
};

const exampleStacks: Stack[] = [
  {
    id: "stack-1",
    data: {
      id: 201,
      name: { fi: "Foxes" },
      orderNo: 0,
      description: { fi: "Common fox species." },
      entityType: "subpinkka",
    },
    speciesIds: [],
    ownerId: "storybook-user",
    createdAt: new Date("2024-01-01T12:00:00.000Z"),
    updatedAt: new Date("2024-01-01T12:00:00.000Z"),
  },
  {
    id: "stack-2",
    data: {
      id: 202,
      name: { fi: "Bears" },
      orderNo: 1,
      description: { fi: "Brown, black, and beyond." },
      entityType: "subpinkka",
    },
    speciesIds: [],
    ownerId: "storybook-user",
    createdAt: new Date("2024-01-01T12:00:00.000Z"),
    updatedAt: new Date("2024-01-01T12:00:00.000Z"),
  },
  {
    id: "stack-3",
    data: {
      id: 203,
      name: { fi: "Mustelids" },
      orderNo: 2,
      description: { fi: "Weasels, martens, and otters." },
      entityType: "subpinkka",
    },
    speciesIds: [],
    ownerId: "storybook-user",
    createdAt: new Date("2024-01-01T12:00:00.000Z"),
    updatedAt: new Date("2024-01-01T12:00:00.000Z"),
  },
];

const meta: Meta<typeof ManageGroupCard> = {
  title: "Components/ManageGroupCard",
  component: ManageGroupCard,
  args: {
    group: exampleGroup,
    stacks: exampleStacks,
    index: 0,
    onGroupDragStart: (index) => {
      console.log("group drag start", index);
    },
    onGroupDragOver: (event, index) => {
      event.preventDefault();
      console.log("group drag over", index);
    },
    onGroupDragEnd: () => {
      console.log("group drag end");
    },
    onAddStack: (groupId) => {
      console.log("add stack", groupId);
    },
    onEditGroup: (group) => {
      console.log("edit group", group.id);
    },
    onDeleteGroup: (groupId) => {
      console.log("delete group", groupId);
    },
    onEditStack: (groupId, stack) => {
      console.log("edit stack", groupId, stack.id);
    },
    onDeleteStack: (stackId) => {
      console.log("delete stack", stackId);
    },
    onStackDragStart: (groupId, index) => {
      console.log("stack drag start", groupId, index);
    },
    onStackDragOver: (event, groupId, index) => {
      event.preventDefault();
      console.log("stack drag over", groupId, index);
    },
    onStackDragEnd: () => {
      console.log("stack drag end");
    },
  },
  render: (args) => (
    <div className="max-w-5xl">
      <ManageGroupCard {...args} />
    </div>
  ),
};

export default meta;

type Story = StoryObj<typeof ManageGroupCard>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    stacks: [],
  },
};
