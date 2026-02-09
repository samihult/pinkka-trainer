"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Selectable option in a scrollable list dialog. */
export interface SelectFromListOption {
  /** Stable identifier returned when the option is confirmed. */
  id: string;
  /** Primary row label shown in the list. */
  label: string;
  /** Optional secondary helper text for the row. */
  description?: string;
}

/** Props for rendering a reusable single-select list dialog. */
export interface SelectFromListDialogProps {
  /** Controls whether the dialog is visible. */
  open: boolean;
  /** Called whenever dialog visibility changes. */
  onOpenChange: (open: boolean) => void;
  /** Dialog title displayed in the header. */
  title: string;
  /** Optional supporting text below the title. */
  description?: string;
  /** Options rendered in the scrollable list. */
  options: SelectFromListOption[];
  /** Called when the user confirms a selected option. */
  onConfirm: (selectedId: string) => void;
  /** Primary action label. */
  confirmLabel?: string;
  /** Secondary action label. */
  cancelLabel?: string;
  /** Message shown when no options are available. */
  emptyMessage?: string;
  /** Accessible label for the option list. */
  listAriaLabel?: string;
}

/** Dialog with a scrollable single-select list and confirm action. */
export function SelectFromListDialog({
  open,
  onOpenChange,
  title,
  description,
  options,
  onConfirm,
  confirmLabel = "Select",
  cancelLabel = "Cancel",
  emptyMessage = "No options available.",
  listAriaLabel = "Selectable options",
}: SelectFromListDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const resolvedSelectedId =
    selectedId && options.some((option) => option.id === selectedId)
      ? selectedId
      : options[0]?.id ?? null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedId(null);
    }
    onOpenChange(nextOpen);
  };

  const handleConfirm = () => {
    if (!resolvedSelectedId) return;
    onConfirm(resolvedSelectedId);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        {options.length > 0 ? (
          <div
            role="listbox"
            aria-label={listAriaLabel}
            className="max-h-72 space-y-2 overflow-y-auto pr-1"
          >
            {options.map((option) => {
              const isSelected = option.id === resolvedSelectedId;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => setSelectedId(option.id)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <p className="text-sm font-medium">{option.label}</p>
                  {option.description ? (
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!resolvedSelectedId || options.length === 0}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
