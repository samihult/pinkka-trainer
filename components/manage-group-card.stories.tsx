import type { Meta, StoryObj } from "@storybook/react";

import { ManageGroupCard } from "@/components/manage-group-card";
import type { Group, Stack } from "@/lib/types";

const exampleGroup: Group = {
  id: "group-1",
  data: {
    name: { fi: "Woodland Mammals" },
    description: { fi: "Stacks for forest-dwelling mammals." },
  },
  pinkkaRef: {
    groupId: 101,
  },
  ownerId: "storybook-user",
  createdAt: new Date("2024-01-01T12:00:00.000Z"),
  updatedAt: new Date("2024-01-01T12:00:00.000Z"),
};

const exampleStacks: Stack[] = [
  {
    id: "stack-1",
    data: {
      name: { fi: "Foxes" },
      description: { fi: "Common fox species." },
    },
    parentGroupId: "group-1",
    order: 0,
    pinkkaRef: {
      groupId: 101,
      stackId: 201,
    },
    ownerId: "storybook-user",
    createdAt: new Date("2024-01-01T12:00:00.000Z"),
    updatedAt: new Date("2024-01-01T12:00:00.000Z"),
  },
  {
    id: "stack-2",
    data: {
      name: { fi: "Bears" },
      description: { fi: "Brown, black, and beyond." },
    },
    parentGroupId: "group-1",
    order: 1,
    pinkkaRef: {
      groupId: 101,
      stackId: 202,
    },
    ownerId: "storybook-user",
    createdAt: new Date("2024-01-01T12:00:00.000Z"),
    updatedAt: new Date("2024-01-01T12:00:00.000Z"),
  },
  {
    id: "stack-3",
    data: {
      name: { fi: "Mustelids" },
      description: { fi: "Weasels, martens, and otters." },
    },
    parentGroupId: "group-1",
    order: 2,
    pinkkaRef: {
      groupId: 101,
      stackId: 203,
    },
    ownerId: "storybook-user",
    createdAt: new Date("2024-01-01T12:00:00.000Z"),
    updatedAt: new Date("2024-01-01T12:00:00.000Z"),
  },
];

const manyStacks: Stack[] = [
  ...exampleStacks,
  {
    id: "stack-4",
    data: {
      name: { fi: "Wolves" },
      description: { fi: "Wolves and close relatives." },
    },
    parentGroupId: "group-1",
    order: 3,
    pinkkaRef: {
      groupId: 101,
      stackId: 204,
    },
    ownerId: "storybook-user",
    createdAt: new Date("2024-01-01T12:00:00.000Z"),
    updatedAt: new Date("2024-01-01T12:00:00.000Z"),
  },
  {
    id: "stack-5",
    data: {
      name: { fi: "Lynx" },
      description: { fi: "Forest cats and relatives." },
    },
    parentGroupId: "group-1",
    order: 4,
    pinkkaRef: {
      groupId: 101,
      stackId: 205,
    },
    ownerId: "storybook-user",
    createdAt: new Date("2024-01-01T12:00:00.000Z"),
    updatedAt: new Date("2024-01-01T12:00:00.000Z"),
  },
  {
    id: "stack-6",
    data: {
      name: { fi: "Rodents" },
      description: { fi: "Small mammals and burrowers." },
    },
    parentGroupId: "group-1",
    order: 5,
    pinkkaRef: {
      groupId: 101,
      stackId: 206,
    },
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
    onToggleGroupVisibility: (group) => {
      console.log("toggle group visibility", group.id);
    },
    onEditStack: (groupId, stack) => {
      console.log("edit stack", groupId, stack.id);
    },
    onDeleteStack: (stackId) => {
      console.log("delete stack", stackId);
    },
    onToggleStackVisibility: (groupId, stack) => {
      console.log("toggle stack visibility", groupId, stack.id);
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

export const ManyStacks: Story = {
  args: {
    stacks: manyStacks,
  },
};
