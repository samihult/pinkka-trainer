"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Props for editing a single species identification tip in a modal dialog. */
export interface SpeciesIdentificationTipDialogProps {
  /** Controls whether the dialog is visible. */
  open: boolean;
  /** Called when dialog visibility changes. */
  onOpenChange: (open: boolean) => void;
  /** Tip value loaded into the text field when the dialog opens. */
  initialValue: string;
  /** Persists the edited tip value. */
  onSave: (value: string) => void;
  /** Whether the dialog edits an existing tip or creates a new one. */
  mode: "create" | "edit";
}

/** Modal editor for a plain-text identification tip. */
export function SpeciesIdentificationTipDialog({
  open,
  onOpenChange,
  initialValue,
  onSave,
  mode,
}: SpeciesIdentificationTipDialogProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
    }
  }, [initialValue, open]);

  const trimmedValue = value.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit"
              ? "Edit Identification Tip"
              : "Add Identification Tip"}
          </DialogTitle>
          <DialogDescription>
            Tips are shown in the learning view identification tab.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="identification-tip-text">Tip</Label>
          <Textarea
            id="identification-tip-text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Describe how to identify this species..."
            rows={5}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSave(trimmedValue)}
            disabled={trimmedValue.length === 0}
          >
            {mode === "edit" ? "Save Changes" : "Add Tip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
