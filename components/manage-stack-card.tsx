"use client";

import type React from "react";

import Link from "next/link";
import { BookOpen, Dna, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";
import type { Stack } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Props for rendering a stack card within a group. */
export interface ManageStackCardProps {
  /** Stack to render. */
  stack: Stack;
  /** Group id that owns the stack. */
  groupId: string;
  /** Index for stack drag-and-drop ordering. */
  index: number;
  /** Called when dragging a stack starts. */
  onDragStart: (groupId: string, index: number) => void;
  /** Called when a stack is dragged over another index. */
  onDragOver: (
    event: React.DragEvent<HTMLDivElement>,
    groupId: string,
    index: number,
  ) => void;
  /** Called when dragging ends. */
  onDragEnd: () => void;
  /** Called when editing the stack. */
  onEdit: (groupId: string, stack: Stack) => void;
  /** Called when deleting the stack. */
  onDelete: (stackId: string) => void;
  /** Called when toggling stack visibility. */
  onToggleVisibility: (groupId: string, stack: Stack) => void;
  className?: string;
}

/** Render a single stack card for the manage content page. */
export function ManageStackCard({
  stack,
  groupId,
  index,
  onDragStart,
  onDragOver,
  onDragEnd,
  onEdit,
  onDelete,
  onToggleVisibility,
  className,
}: React.ComponentProps<Card> & ManageStackCardProps) {
  const isHidden = stack.isHidden ?? false;

  return (
    <Card
      draggable
      onDragStart={() => onDragStart(groupId, index)}
      onDragOver={(event) => onDragOver(event, groupId, index)}
      onDragEnd={onDragEnd}
      className={cn(
        className,
        "break-inside-avoid transition-shadow shadow-xs hover:shadow-sm rounded-xs cursor-move gap-0",
      )}
    >
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          {getLocalizedText(stack.data.name, "fi")}
          {isHidden && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Hidden
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-1">
        <Button size="icon-xs" variant="minimal">
          <Link href={`/manage/species/${stack.id}`} className="cursor-default">
            <Dna className="h-3 w-3" />
          </Link>
        </Button>
        <Button
          size="icon-xs"
          variant="minimal"
          onClick={() => onEdit(groupId, stack)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          size="icon-xs"
          variant="minimal"
          onClick={() => onToggleVisibility(groupId, stack)}
          aria-label={isHidden ? "Make stack public" : "Hide stack"}
          title={isHidden ? "Make public" : "Hide"}
        >
          {isHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>
        <Button
          size="icon-xs"
          variant="minimal-destructive"
          onClick={() => onDelete(stack.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
