"use client";

import type React from "react";

import { FolderOpen, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ManageStackCard } from "@/components/manage-stack-card";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";
import type { Group, Stack } from "@/lib/types";

/** Props for the manage content stack group card. */
export interface ManageGroupCardProps {
  /** Group to render in the card. */
  group: Group;
  /** Stacks belonging to the group. */
  stacks: Stack[];
  /** Index for group drag-and-drop ordering. */
  index: number;
  /** Called when dragging a group starts. */
  onGroupDragStart: (index: number) => void;
  /** Called when a group is dragged over another index. */
  onGroupDragOver: (
    event: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => void;
  /** Called when group dragging ends. */
  onGroupDragEnd: () => void;
  /** Called when adding a stack to the group. */
  onAddStack: (groupId: string) => void;
  /** Called when editing a group. */
  onEditGroup: (group: Group) => void;
  /** Called when deleting a group. */
  onDeleteGroup: (groupId: string) => void;
  /** Called when editing a stack. */
  onEditStack: (groupId: string, stack: Stack) => void;
  /** Called when deleting a stack. */
  onDeleteStack: (stackId: string) => void;
  /** Called when dragging a stack starts. */
  onStackDragStart: (groupId: string, index: number) => void;
  /** Called when a stack is dragged over another index. */
  onStackDragOver: (
    event: React.DragEvent<HTMLDivElement>,
    groupId: string,
    index: number,
  ) => void;
  /** Called when stack dragging ends. */
  onStackDragEnd: () => void;
}

/** Render a group card with its stacks on the manage content page. */
export function ManageGroupCard({
  group,
  stacks,
  index,
  onGroupDragStart,
  onGroupDragOver,
  onGroupDragEnd,
  onAddStack,
  onEditGroup,
  onDeleteGroup,
  onEditStack,
  onDeleteStack,
  onStackDragStart,
  onStackDragOver,
  onStackDragEnd,
}: ManageGroupCardProps) {
  return (
    <Card
      draggable
      onDragStart={() => onGroupDragStart(index)}
      onDragOver={(event) => onGroupDragOver(event, index)}
      onDragEnd={onGroupDragEnd}
      className="cursor-move gap-3"
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex gap-3 flex-1">
            <GripVertical className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                {getLocalizedText(group.data.name, "fi")}
              </CardTitle>
              {getLocalizedText(group.data.description, "fi") && (
                <CardDescription className="mt-1">
                  {getLocalizedText(group.data.description, "fi")}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddStack(group.id)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Stack
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEditGroup(group)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDeleteGroup(group.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="columns-1 gap-x-5 sm:columns-2 lg:columns-3">
          {stacks.map((stack, stackIndex) => (
            <ManageStackCard
              key={stack.id}
              stack={stack}
              groupId={group.id}
              index={stackIndex}
              onDragStart={onStackDragStart}
              onDragOver={onStackDragOver}
              onDragEnd={onStackDragEnd}
              onEdit={onEditStack}
              onDelete={onDeleteStack}
              className="mb-3"
            />
          ))}

          {stacks.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              <p className="mb-2">No stacks in this group yet</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddStack(group.id)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add First Stack
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
