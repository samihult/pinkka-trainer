import type { Meta, StoryObj } from "@storybook/react";

import { ManageStackCard } from "@/components/manage-stack-card";
import type { Stack } from "@/lib/types";

const exampleStack: Stack = {
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
};

const meta: Meta<typeof ManageStackCard> = {
  title: "Components/ManageStackCard",
  component: ManageStackCard,
  args: {
    stack: exampleStack,
    groupId: "group-1",
    index: 0,
    onDragStart: (groupId, index) => {
      console.log("stack drag start", groupId, index);
    },
    onDragOver: (event, groupId, index) => {
      event.preventDefault();
      console.log("stack drag over", groupId, index);
    },
    onDragEnd: () => {
      console.log("stack drag end");
    },
    onEdit: (groupId, stack) => {
      console.log("edit stack", groupId, stack.id);
    },
    onDelete: (stackId) => {
      console.log("delete stack", stackId);
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
