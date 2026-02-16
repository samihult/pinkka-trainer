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
import { useI18n } from "@/lib/i18n";
import type { LocalizedText } from "@/lib/types";

/** Props for editing a single multilingual identification hint in a modal dialog. */
export interface SpeciesIdentificationHintDialogProps {
  /** Controls whether the dialog is visible. */
  open: boolean;
  /** Called when dialog visibility changes. */
  onOpenChange: (open: boolean) => void;
  /** Localized hint value loaded into the form when opening the dialog. */
  initialValue?: LocalizedText;
  /** Persists the edited localized hint value. */
  onSave: (value: LocalizedText) => void;
  /** Whether the dialog edits an existing hint or creates a new one. */
  mode: "create" | "edit";
}

/** Modal editor for a multilingual identification hint. */
export function SpeciesIdentificationHintDialog({
  open,
  onOpenChange,
  initialValue,
  onSave,
  mode,
}: SpeciesIdentificationHintDialogProps) {
  const { t } = useI18n();
  const [finnishValue, setFinnishValue] = useState("");
  const [englishValue, setEnglishValue] = useState("");
  const [swedishValue, setSwedishValue] = useState("");

  useEffect(() => {
    if (!open) return;
    setFinnishValue(initialValue?.fi ?? "");
    setEnglishValue(initialValue?.en ?? "");
    setSwedishValue(initialValue?.sv ?? "");
  }, [initialValue, open]);

  const normalizedHint: LocalizedText = {
    ...(finnishValue.trim() ? { fi: finnishValue.trim() } : {}),
    ...(englishValue.trim() ? { en: englishValue.trim() } : {}),
    ...(swedishValue.trim() ? { sv: swedishValue.trim() } : {}),
  };
  const hasAnyHintText = Object.keys(normalizedHint).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit"
              ? t("manage.speciesHintDialog.title.edit")
              : t("manage.speciesHintDialog.title.create")}
          </DialogTitle>
          <DialogDescription>
            {t("manage.speciesHintDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="identification-hint-fi">
              {t("manage.speciesHintDialog.field.fi")}
            </Label>
            <Textarea
              id="identification-hint-fi"
              value={finnishValue}
              onChange={(event) => setFinnishValue(event.target.value)}
              placeholder={t("manage.speciesHintDialog.placeholder.fi")}
              rows={3}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="identification-hint-en">
              {t("manage.speciesHintDialog.field.en")}
            </Label>
            <Textarea
              id="identification-hint-en"
              value={englishValue}
              onChange={(event) => setEnglishValue(event.target.value)}
              placeholder={t("manage.speciesHintDialog.placeholder.en")}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="identification-hint-sv">
              {t("manage.speciesHintDialog.field.sv")}
            </Label>
            <Textarea
              id="identification-hint-sv"
              value={swedishValue}
              onChange={(event) => setSwedishValue(event.target.value)}
              placeholder={t("manage.speciesHintDialog.placeholder.sv")}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("manage.speciesHintDialog.action.cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => onSave(normalizedHint)}
            disabled={!hasAnyHintText}
          >
            {mode === "edit"
              ? t("manage.speciesHintDialog.action.save")
              : t("manage.speciesHintDialog.action.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
