import type React from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { ManageStackCard } from "@/components/manage-stack-card";
import type { Stack } from "@/lib/types";

const exampleStack: Stack = {
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
};

const meta: Meta<typeof ManageStackCard> = {
  title: "Components/ManageStackCard",
  component: ManageStackCard,
  args: {
    stack: exampleStack,
    groupId: "group-1",
    index: 0,
    onDragStart: (groupId: string, index: number) => {
      console.log("stack drag start", groupId, index);
    },
    onDragOver: (
      event: React.DragEvent<HTMLDivElement>,
      groupId: string,
      index: number,
    ) => {
      event.preventDefault();
      console.log("stack drag over", groupId, index);
    },
    onDragEnd: () => {
      console.log("stack drag end");
    },
    onEdit: (groupId: string, stack: Stack) => {
      console.log("edit stack", groupId, stack.id);
    },
    onDelete: (stackId: string) => {
      console.log("delete stack", stackId);
    },
    onToggleVisibility: (groupId: string, stack: Stack) => {
      console.log("toggle stack visibility", groupId, stack.id);
    },
  },
  render: (args) => (
    <div className="max-w-sm">
      <ManageStackCard {...args} />
    </div>
  ),
};

export default meta;

type Story = StoryObj<typeof ManageStackCard>;

export const Default: Story = {};
