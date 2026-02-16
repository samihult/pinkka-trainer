"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ImageGridSelector } from "@/components/image-grid-selector";
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
import { getSpeciesImageUrl } from "@/lib/content/content-display";
import { useI18n } from "@/lib/i18n";
import type { LocalizedText, SpeciesImage } from "@/lib/types";

/** Editable hint value for the identification hint dialog. */
export interface SpeciesIdentificationHintDialogValue {
  /** Localized hint text content. */
  text: LocalizedText;
  /** Optional referenced species image id. */
  imageId?: string;
}

/** Props for editing a single multilingual identification hint in a modal dialog. */
export interface SpeciesIdentificationHintDialogProps {
  /** Controls whether the dialog is visible. */
  open: boolean;
  /** Called when dialog visibility changes. */
  onOpenChange: (open: boolean) => void;
  /** Species images available for optional hint image references. */
  availableImages: SpeciesImage[];
  /** Hint value loaded into the form when opening the dialog. */
  initialValue?: SpeciesIdentificationHintDialogValue;
  /** Persists the edited hint value. */
  onSave: (value: SpeciesIdentificationHintDialogValue) => void;
  /** Whether the dialog edits an existing hint or creates a new one. */
  mode: "create" | "edit";
}

/** Modal editor for a multilingual identification hint with optional image reference selection. */
export function SpeciesIdentificationHintDialog({
  open,
  onOpenChange,
  availableImages,
  initialValue,
  onSave,
  mode,
}: SpeciesIdentificationHintDialogProps) {
  const { t } = useI18n();
  const [finnishValue, setFinnishValue] = useState(initialValue?.text.fi ?? "");
  const [englishValue, setEnglishValue] = useState(initialValue?.text.en ?? "");
  const [swedishValue, setSwedishValue] = useState(initialValue?.text.sv ?? "");
  const [selectedImageId, setSelectedImageId] = useState<string | undefined>(
    initialValue?.imageId,
  );
  const [isImageSelectorOpen, setIsImageSelectorOpen] = useState(false);
  const [imageSelection, setImageSelection] = useState<string[]>([]);

  const selectableImageOptions = useMemo(
    () =>
      availableImages.map((image, index) => ({
        id: image.id,
        src: getSpeciesImageUrl(image) || "/placeholder.svg",
        alt: t("manage.speciesForm.imageAlt", { number: index + 1 }),
        label: t("manage.speciesForm.imageLabel", { number: index + 1 }),
      })),
    [availableImages, t],
  );

  const selectedImage = useMemo(() => {
    if (!selectedImageId) return null;
    const index = availableImages.findIndex(
      (image) => image.id === selectedImageId,
    );
    if (index < 0) return null;

    return {
      image: availableImages[index],
      index,
    };
  }, [availableImages, selectedImageId]);

  const normalizedHintText: LocalizedText = {
    ...(finnishValue.trim() ? { fi: finnishValue.trim() } : {}),
    ...(englishValue.trim() ? { en: englishValue.trim() } : {}),
    ...(swedishValue.trim() ? { sv: swedishValue.trim() } : {}),
  };
  const hasAnyHintText = Object.keys(normalizedHintText).length > 0;

  const handleImageSelectorOpen = () => {
    const hasSelectedImage = selectedImageId
      ? availableImages.some((image) => image.id === selectedImageId)
      : false;

    if (!hasSelectedImage) {
      setSelectedImageId(undefined);
    }

    setImageSelection(
      hasSelectedImage && selectedImageId ? [selectedImageId] : [],
    );
    setIsImageSelectorOpen(true);
  };

  const handleImageSelectorOpenChange = (nextOpen: boolean) => {
    setIsImageSelectorOpen(nextOpen);
    if (!nextOpen) {
      setImageSelection([]);
    }
  };

  const handleImageSelect = () => {
    const nextImageId = imageSelection[0];
    if (!nextImageId) return;
    setSelectedImageId(nextImageId);
    handleImageSelectorOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
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
            <div className="space-y-2">
              <Label>
                {t("manage.speciesHintDialog.section.imageReference")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("manage.speciesHintDialog.help.imageReference")}
              </p>
              {selectedImage ? (
                <div className="space-y-2 rounded-md border border-border p-2">
                  <div className="relative mx-auto aspect-square w-full max-w-56 overflow-hidden rounded-md border border-border/70 bg-muted/20">
                    <Image
                      src={
                        getSpeciesImageUrl(selectedImage.image) ||
                        "/placeholder.svg"
                      }
                      alt={t("manage.speciesForm.imageAlt", {
                        number: selectedImage.index + 1,
                      })}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleImageSelectorOpen}
                    >
                      {t("manage.speciesHintDialog.action.changeImage")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedImageId(undefined)}
                    >
                      {t("manage.speciesHintDialog.action.deleteImage")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleImageSelectorOpen}
                    disabled={availableImages.length === 0}
                  >
                    {t("manage.speciesHintDialog.action.addImage")}
                  </Button>
                  {availableImages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("manage.speciesHintDialog.emptyImages")}
                    </p>
                  ) : null}
                </div>
              )}
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
              onClick={() =>
                onSave({
                  text: normalizedHintText,
                  ...(selectedImageId ? { imageId: selectedImageId } : {}),
                })
              }
              disabled={!hasAnyHintText}
            >
              {mode === "edit"
                ? t("manage.speciesHintDialog.action.save")
                : t("manage.speciesHintDialog.action.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isImageSelectorOpen}
        onOpenChange={handleImageSelectorOpenChange}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("manage.speciesHintDialog.imageDialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("manage.speciesHintDialog.imageDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <ImageGridSelector
            items={selectableImageOptions}
            selectedIds={imageSelection}
            onSelectedIdsChange={setImageSelection}
            maxSelected={1}
            emptyMessage={t("manage.speciesHintDialog.emptyImages")}
            gridAriaLabel={t("manage.speciesHintDialog.imageDialog.gridAria")}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleImageSelectorOpenChange(false)}
            >
              {t("manage.speciesHintDialog.action.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleImageSelect}
              disabled={imageSelection.length === 0}
            >
              {t("manage.speciesHintDialog.imageDialog.action.select")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
