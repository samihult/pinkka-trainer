"use client";

import type React from "react";

import { GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Props for a draggable horizontal item container. */
export interface DraggableHorizontalItemProps {
  /** Position index used for drag-and-drop ordering. */
  index: number;
  /** Child content to display inside the container. */
  children: React.ReactNode;
  /** Called when dragging starts. */
  onDragStart: (index: number) => void;
  /** Called when the container is dragged over another index. */
  onDragOver: (event: React.DragEvent<HTMLDivElement>, index: number) => void;
  /** Called when dragging ends. */
  onDragEnd: () => void;
  /** Optional className overrides for the outer container. */
  className?: string;
  /** Optional className overrides for the inner content wrapper. */
  contentClassName?: string;
  /** Whether to show the drag handle icon. */
  showDragHandle?: boolean;
}

/** Draggable container for horizontal content blocks that can be reordered. */
export function DraggableHorizontalItem({
  index,
  children,
  onDragStart,
  onDragOver,
  onDragEnd,
  className,
  contentClassName,
  showDragHandle = true,
}: DraggableHorizontalItemProps) {
  return (
    <Card
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(event) => onDragOver(event, index)}
      onDragEnd={onDragEnd}
      className={cn("cursor-move hover:shadow-md transition-shadow", className)}
    >
      <CardContent className={cn(contentClassName, "px-4")}>
        <div className="flex gap-4">
          {showDragHandle && (
            <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
          )}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}
