"use client";

import type React from "react";

import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLocalizedText } from "@/lib/content/content-display";
import type { Stack } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";

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
}: ManageStackCardProps) {
  const { language } = useLanguagePreference();
  const preferredLanguage = toLanguageCode(language);
  const isHidden = stack.isHidden ?? false;
  const linkedPinkkaStackId = stack.pinkkaRef?.stackId ?? null;
  const linkedPinkkaGroupId = stack.pinkkaRef?.groupId;
  const linkedPinkkaStackHref = linkedPinkkaStackId
    ? linkedPinkkaGroupId
      ? `/manage/pinkka?group=${linkedPinkkaGroupId}&stack=${linkedPinkkaStackId}`
      : `/manage/pinkka?stack=${linkedPinkkaStackId}`
    : null;

  return (
    <Card
      draggable
      onDragStart={() => onDragStart(groupId, index)}
      onDragOver={(event) => onDragOver(event, groupId, index)}
      onDragEnd={onDragEnd}
      className={cn(
        className,
        "break-inside-avoid transition-shadow shadow-xs hover:shadow-sm rounded-xs cursor-move gap-0 py-5 relative overflow-hidden",
      )}
    >
      <CardContent className="flex flex-col gap-2 pr-16 items-start">
        {getLocalizedText(stack.data.name, preferredLanguage)}
        {linkedPinkkaStackId && linkedPinkkaStackHref ? (
          <p className="text-xs text-muted-foreground">
            Linked Pinkka stack:{" "}
            <Link
              href={linkedPinkkaStackHref}
              className="font-medium underline underline-offset-2 hover:text-foreground"
            >
              #{linkedPinkkaStackId}
            </Link>
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 mr-3">
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
            {isHidden ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
          </Button>
          <Button
            size="icon-xs"
            variant="minimal-destructive"
            onClick={() => onDelete(stack.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          {isHidden && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Hidden
            </span>
          )}
        </div>
      </CardContent>
      <Button
        size="icon-lg"
        variant="ghost"
        asChild
        className="absolute right-0 top-0 h-full w-14 rounded-none rounded-r-xs border-l bg-muted/40 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
      >
        <Link
          href={`/manage/content/${stack.id}/species/`}
          aria-label="Open species"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </Button>
    </Card>
  );
}
