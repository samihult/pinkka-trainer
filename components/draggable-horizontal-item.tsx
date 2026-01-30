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
  /** Visual style variant for the card container. */
  variant?: "detailed" | "minimal";
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
  variant = "detailed",
}: DraggableHorizontalItemProps) {
  return (
    <Card
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(event) => onDragOver(event, index)}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-move transition-shadow",
        variant === "detailed" && "hover:shadow-md",
        variant === "minimal" && "border-0 shadow-none py-0 bg-transparent",
        className,
      )}
    >
      <CardContent
        className={cn(
          variant === "minimal" ? "px-0" : "px-4",
          contentClassName,
        )}
      >
        <div
          className={cn(
            "flex",
            variant === "minimal" ? "items-center gap-2" : "gap-4",
          )}
        >
          {showDragHandle && (
            <GripVertical
              className={cn(
                "text-muted-foreground flex-shrink-0",
                variant === "minimal" ? "mt-0 h-3 w-3" : "mt-1 h-5 w-5",
              )}
            />
          )}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}
