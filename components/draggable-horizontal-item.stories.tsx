import type { Meta, StoryObj } from "@storybook/react";
import { useState, type DragEvent } from "react";

import { DraggableHorizontalItem } from "./draggable-horizontal-item";

const meta: Meta<typeof DraggableHorizontalItem> = {
  title: "Components/DraggableHorizontalItem",
  component: DraggableHorizontalItem,
  args: {
    index: 0,
    onDragStart: () => {},
    onDragOver: (event) => event.preventDefault(),
    onDragEnd: () => {},
    children: (
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold">Single item</div>
          <div className="text-sm text-muted-foreground">
            Drag handle lives on the container.
          </div>
        </div>
        <div className="text-xs text-muted-foreground">#1</div>
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof DraggableHorizontalItem>;

export const SingleItem: Story = {};

export const Minimal: Story = {
  args: {
    variant: "minimal",
    children: (
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-semibold">Minimal item</div>
      </div>
    ),
  },
};

export const ReorderableList: Story = {
  render: () => {
    const [items, setItems] = useState([
      { id: "item-1", title: "Abies alba", meta: "Silver fir" },
      { id: "item-2", title: "Betula pendula", meta: "Silver birch" },
      { id: "item-3", title: "Pinus sylvestris", meta: "Scots pine" },
    ]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleDragStart = (index: number) => {
      setDraggedIndex(index);
    };

    const handleDragOver = (
      event: DragEvent<HTMLDivElement>,
      index: number,
    ) => {
      event.preventDefault();
      if (draggedIndex === null || draggedIndex === index) return;

      setItems((prev) => {
        const next = [...prev];
        const [dragged] = next.splice(draggedIndex, 1);
        next.splice(index, 0, dragged);
        return next;
      });
      setDraggedIndex(index);
    };

    const handleDragEnd = () => {
      setDraggedIndex(null);
    };

    return (
      <div className="max-w-2xl space-y-3">
        {items.map((item, index) => (
          <DraggableHorizontalItem
            key={item.id}
            index={index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">{item.title}</div>
                <div className="text-sm text-muted-foreground">{item.meta}</div>
              </div>
              <div className="text-xs text-muted-foreground">{index + 1}</div>
            </div>
          </DraggableHorizontalItem>
        ))}
      </div>
    );
  },
};
