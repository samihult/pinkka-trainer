"use client";

import type React from "react";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "./image-upload";
import { SpeciesIdentificationHintDialog } from "@/components/species-identification-hint-dialog";
import type { LocalizedText, Species, SpeciesImage } from "@/lib/types";
import { uploadSpeciesImage } from "@/lib/firebase/firestore-helpers";
import { useToast } from "@/hooks/use-toast";
import {
  getLocalizedText,
  getSpeciesImageUrl,
} from "@/lib/content/content-display";
import { useI18n } from "@/lib/i18n";
import Image from "next/image";

type SpeciesFormTab = "information" | "pictures" | "identification";

/** Props for creating or editing a species. */
interface SpeciesFormProps {
  /** Optional existing species to edit. */
  species?: Species;
  /** Parent stack id for new species. */
  stackId: string;
  /** Submit handler for form data. */
  onSubmit: (payload: {
    /** Updated species detail payload. */
    data: Species["data"];
    /** Image ids enabled for test prompts. */
    testImageIds: string[];
  }) => Promise<void>;
  /** Cancel handler for dismissing the form. */
  onCancel: () => void;
}

/** Tabbed form for creating or editing species metadata, images, and multilingual identification hints. */
export function SpeciesForm({
  species,
  stackId: _stackId,
  onSubmit,
  onCancel,
}: SpeciesFormProps) {
  const [activeTab, setActiveTab] = useState<SpeciesFormTab>("information");
  const [scientificName, setScientificName] = useState(
    species?.data.scientificName || "",
  );
  const [finnishName, setFinnishName] = useState(
    getLocalizedText(species?.data.vernacularName, "fi"),
  );
  const [englishName, setEnglishName] = useState(
    getLocalizedText(species?.data.vernacularName, "en"),
  );
  const [swedishName, setSwedishName] = useState(
    getLocalizedText(species?.data.vernacularName, "sv"),
  );
  const descriptionEntry = species?.data.description?.[0];
  const [descriptionFi, setDescriptionFi] = useState(
    descriptionEntry ? getLocalizedText(descriptionEntry.body, "fi") : "",
  );
  const [descriptionEn, setDescriptionEn] = useState(
    descriptionEntry ? getLocalizedText(descriptionEntry.body, "en") : "",
  );
  const [descriptionSv, setDescriptionSv] = useState(
    descriptionEntry ? getLocalizedText(descriptionEntry.body, "sv") : "",
  );
  const [images, setImages] = useState<SpeciesImage[]>(
    species?.data.images || [],
  );
  const [identificationHints, setIdentificationHints] = useState<
    LocalizedText[]
  >(() => {
    if (species?.data.identificationHints?.length) {
      return species.data.identificationHints;
    }
    return (species?.data.identificationTips ?? []).map((tip) => ({ fi: tip }));
  });
  const [isHintDialogOpen, setIsHintDialogOpen] = useState(false);
  const [editingHintIndex, setEditingHintIndex] = useState<number | null>(null);
  const [testImageIds, setTestImageIds] = useState<string[]>(() => {
    const imageIds = (species?.data.images || []).map((image) => image.id);
    const existingIds = species?.testImageIds?.filter((id) =>
      imageIds.includes(id),
    );
    return existingIds && existingIds.length > 0 ? existingIds : imageIds;
  });
  const previousImageIdsRef = useRef<string[]>(
    (species?.data.images || []).map((image) => image.id),
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { t } = useI18n();
  const { toast } = useToast();
  const testSelectionError = images.length > 0 && testImageIds.length === 0;
  const editingHintValue =
    editingHintIndex !== null
      ? identificationHints[editingHintIndex]
      : undefined;

  useEffect(() => {
    const imageIds = images.map((image) => image.id);
    const previousImageIds = previousImageIdsRef.current;

    setTestImageIds((prev) => {
      const preserved = prev.filter((id) => imageIds.includes(id));
      const newIds = imageIds.filter((id) => !previousImageIds.includes(id));
      return [...preserved, ...newIds];
    });

    previousImageIdsRef.current = imageIds;
  }, [images]);

  /** Upload a file or stage it for new species before saving. */
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      // For new species, we'll upload after creation
      // For existing species, upload immediately
      if (species?.id) {
        const newImage = await uploadSpeciesImage(
          species.id,
          file,
          images.length,
        );
        setImages([...images, newImage]);
        toast({
          title: t("manage.speciesForm.toast.imageUploadedTitle"),
          description: t("manage.speciesForm.toast.imageUploadedDescription"),
        });
      } else {
        // Store file temporarily for upload after species creation
        const reader = new FileReader();
        reader.onload = (e) => {
          const tempImage: SpeciesImage = {
            id: `temp-${Date.now()}`,
            urls: {
              original: e.target?.result as string,
              full: e.target?.result as string,
              large: e.target?.result as string,
              square: e.target?.result as string,
              thumbnail: e.target?.result as string,
            },
          };
          setImages([...images, tempImage]);
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      toast({
        title: t("auth.errorTitle"),
        description: t("manage.speciesForm.toast.uploadErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  /** Submit the form data to the caller. */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (testSelectionError) {
        setActiveTab("pictures");
        toast({
          title: t("manage.speciesForm.toast.selectTestImagesTitle"),
          description: t(
            "manage.speciesForm.toast.selectTestImagesDescription",
          ),
          variant: "destructive",
        });
        return;
      }
      if (!scientificName.trim()) {
        setActiveTab("information");
        toast({
          title: t("manage.speciesForm.toast.scientificNameRequiredTitle"),
          description: t(
            "manage.speciesForm.toast.scientificNameRequiredDescription",
          ),
          variant: "destructive",
        });
        return;
      }

      const vernacularName =
        finnishName || englishName || swedishName
          ? {
              ...(finnishName ? { fi: finnishName } : {}),
              ...(englishName ? { en: englishName } : {}),
              ...(swedishName ? { sv: swedishName } : {}),
            }
          : undefined;
      const descriptionBody: { fi?: string; en?: string; sv?: string } = {};
      if (descriptionFi) descriptionBody.fi = descriptionFi;
      if (descriptionEn) descriptionBody.en = descriptionEn;
      if (descriptionSv) descriptionBody.sv = descriptionSv;
      const descriptionTitle: { fi?: string; en?: string; sv?: string } = {};
      if (descriptionBody.fi) {
        descriptionTitle.fi = descriptionEntry?.title?.fi ?? "Description";
      }
      if (descriptionBody.en) {
        descriptionTitle.en = descriptionEntry?.title?.en ?? "Description";
      }
      if (descriptionBody.sv) {
        descriptionTitle.sv = descriptionEntry?.title?.sv ?? "Description";
      }
      const normalizedIdentificationHints = identificationHints
        .map((hint) => ({
          ...(hint.fi?.trim() ? { fi: hint.fi.trim() } : {}),
          ...(hint.en?.trim() ? { en: hint.en.trim() } : {}),
          ...(hint.sv?.trim() ? { sv: hint.sv.trim() } : {}),
        }))
        .filter((hint) => Object.keys(hint).length > 0);
      const detail: Species["data"] = {
        ...(species?.data || {}),
        taxonId: species?.data.taxonId || `local-${Date.now()}`,
        scientificName: scientificName.trim(),
        images,
      };
      if (vernacularName) {
        detail.vernacularName = vernacularName;
      } else {
        delete detail.vernacularName;
      }
      if (Object.keys(descriptionBody).length > 0) {
        detail.description = [
          {
            title: descriptionTitle,
            body: descriptionBody,
            predicate: descriptionEntry?.predicate ?? "description",
          },
        ];
      } else {
        delete detail.description;
      }
      if (normalizedIdentificationHints.length > 0) {
        detail.identificationHints = normalizedIdentificationHints;
      } else {
        delete detail.identificationHints;
      }
      delete detail.identificationTips;

      await onSubmit({
        data: detail,
        testImageIds:
          testImageIds.length > 0
            ? testImageIds
            : images.map((image) => image.id),
      });
    } catch (error) {
      toast({
        title: t("auth.errorTitle"),
        description: t("manage.speciesForm.toast.saveErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestImageToggle = (imageId: string) => {
    setTestImageIds((prev) => {
      const isEnabled = prev.includes(imageId);
      if (isEnabled) {
        return prev.filter((id) => id !== imageId);
      }
      const next = [...prev, imageId];
      return images.map((image) => image.id).filter((id) => next.includes(id));
    });
  };

  const handleHintDialogOpenChange = (open: boolean) => {
    setIsHintDialogOpen(open);
    if (!open) {
      setEditingHintIndex(null);
    }
  };

  const handleAddHint = () => {
    setEditingHintIndex(null);
    setIsHintDialogOpen(true);
  };

  const handleEditHint = (index: number) => {
    setEditingHintIndex(index);
    setIsHintDialogOpen(true);
  };

  const handleDeleteHint = (index: number) => {
    setIdentificationHints((prev) =>
      prev.filter((_, hintIndex) => hintIndex !== index),
    );
  };

  const handleSaveHint = (value: LocalizedText) => {
    setIdentificationHints((prev) => {
      if (editingHintIndex === null) {
        return [...prev, value];
      }
      return prev.map((hint, index) =>
        index === editingHintIndex ? value : hint,
      );
    });
    handleHintDialogOpenChange(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {species
            ? t("manage.speciesForm.title.edit")
            : t("manage.speciesForm.title.create")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="inline-flex gap-1 rounded-md border border-border bg-muted/40 p-1">
            <Button
              type="button"
              variant={activeTab === "information" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("information")}
            >
              {t("manage.speciesForm.tab.information")}
            </Button>
            <Button
              type="button"
              variant={activeTab === "pictures" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("pictures")}
            >
              {t("manage.speciesForm.tab.pictures")}
            </Button>
            <Button
              type="button"
              variant={activeTab === "identification" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("identification")}
            >
              {t("manage.speciesForm.tab.identification")}
            </Button>
          </div>

          {activeTab === "information" ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="scientificName">
                  {t("manage.speciesForm.field.scientificName")}
                </Label>
                <Input
                  id="scientificName"
                  value={scientificName}
                  onChange={(e) => setScientificName(e.target.value)}
                  placeholder={t(
                    "manage.speciesForm.placeholder.scientificName",
                  )}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="finnishName">
                    {t("manage.speciesForm.field.finnishName")}
                  </Label>
                  <Input
                    id="finnishName"
                    value={finnishName}
                    onChange={(e) => setFinnishName(e.target.value)}
                    placeholder={t(
                      "manage.speciesForm.placeholder.finnishName",
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="englishName">
                    {t("manage.speciesForm.field.englishName")}
                  </Label>
                  <Input
                    id="englishName"
                    value={englishName}
                    onChange={(e) => setEnglishName(e.target.value)}
                    placeholder={t(
                      "manage.speciesForm.placeholder.englishName",
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swedishName">
                    {t("manage.speciesForm.field.swedishName")}
                  </Label>
                  <Input
                    id="swedishName"
                    value={swedishName}
                    onChange={(e) => setSwedishName(e.target.value)}
                    placeholder={t(
                      "manage.speciesForm.placeholder.swedishName",
                    )}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="descriptionFi">
                    {t("manage.speciesForm.field.descriptionFi")}
                  </Label>
                  <Textarea
                    id="descriptionFi"
                    value={descriptionFi}
                    onChange={(e) => setDescriptionFi(e.target.value)}
                    placeholder={t(
                      "manage.speciesForm.placeholder.description",
                    )}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descriptionEn">
                    {t("manage.speciesForm.field.descriptionEn")}
                  </Label>
                  <Textarea
                    id="descriptionEn"
                    value={descriptionEn}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    placeholder={t(
                      "manage.speciesForm.placeholder.description",
                    )}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descriptionSv">
                    {t("manage.speciesForm.field.descriptionSv")}
                  </Label>
                  <Textarea
                    id="descriptionSv"
                    value={descriptionSv}
                    onChange={(e) => setDescriptionSv(e.target.value)}
                    placeholder={t(
                      "manage.speciesForm.placeholder.description",
                    )}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "pictures" ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>{t("manage.speciesForm.section.images")}</Label>
                <ImageUpload
                  images={images}
                  onImagesChange={setImages}
                  onFileUpload={handleFileUpload}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("manage.speciesForm.section.testImages")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("manage.speciesForm.help.testImages")}
                </p>
                {images.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("manage.speciesForm.help.addImagesForTests")}
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {images.map((image, index) => {
                      const imageId = image.id;
                      const inputId = `test-image-${imageId}`;
                      const isChecked = testImageIds.includes(imageId);
                      const imageUrl =
                        getSpeciesImageUrl(image) || "/placeholder.svg";

                      return (
                        <label
                          key={imageId}
                          htmlFor={inputId}
                          className="cursor-pointer"
                        >
                          <input
                            id={inputId}
                            type="checkbox"
                            className="peer sr-only"
                            checked={isChecked}
                            onChange={() => handleTestImageToggle(imageId)}
                          />
                          <Card className="overflow-hidden border border-border transition peer-checked:ring-2 peer-checked:ring-primary">
                            <div className="relative aspect-square">
                              <Image
                                src={imageUrl}
                                alt={t("manage.speciesForm.imageAlt", {
                                  number: index + 1,
                                })}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex items-center justify-between p-2 text-xs text-muted-foreground">
                              <span>
                                {t("manage.speciesForm.imageLabel", {
                                  number: index + 1,
                                })}
                              </span>
                              <span
                                className={
                                  isChecked ? "text-foreground" : undefined
                                }
                              >
                                {isChecked
                                  ? t("manage.speciesForm.imageState.test")
                                  : t("manage.speciesForm.imageState.excluded")}
                              </span>
                            </div>
                          </Card>
                        </label>
                      );
                    })}
                  </div>
                )}
                {testSelectionError && (
                  <p className="text-sm text-destructive">
                    {t("manage.speciesForm.error.testImageRequired")}
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "identification" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Label>
                  {t("manage.speciesForm.section.identificationHints")}
                </Label>
                <Button type="button" size="sm" onClick={handleAddHint}>
                  {t("manage.speciesForm.action.addHint")}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("manage.speciesForm.help.identificationHints")}
              </p>
              {identificationHints.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  {t("manage.speciesForm.empty.identificationHints")}
                </p>
              ) : (
                <div className="space-y-2">
                  {identificationHints.map((hint, index) => (
                    <div
                      key={`${hint.fi ?? hint.en ?? hint.sv ?? "hint"}-${index}`}
                      className="flex items-start justify-between gap-2 rounded-md border border-border px-3 py-2"
                    >
                      <div className="space-y-1 text-sm">
                        {hint.fi ? (
                          <p className="whitespace-pre-wrap">
                            <span className="font-medium">FI:</span> {hint.fi}
                          </p>
                        ) : null}
                        {hint.en ? (
                          <p className="whitespace-pre-wrap">
                            <span className="font-medium">EN:</span> {hint.en}
                          </p>
                        ) : null}
                        {hint.sv ? (
                          <p className="whitespace-pre-wrap">
                            <span className="font-medium">SV:</span> {hint.sv}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditHint(index)}
                        >
                          {t("manage.speciesForm.action.editHint")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteHint(index)}
                        >
                          {t("manage.speciesForm.action.deleteHint")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving || uploading}>
              {saving
                ? t("manage.speciesForm.action.saving")
                : species
                  ? t("manage.speciesForm.action.update")
                  : t("manage.speciesForm.action.create")}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("manage.speciesForm.action.cancel")}
            </Button>
          </div>
        </form>
        <SpeciesIdentificationHintDialog
          open={isHintDialogOpen}
          onOpenChange={handleHintDialogOpenChange}
          initialValue={editingHintValue}
          onSave={handleSaveHint}
          mode={editingHintIndex === null ? "create" : "edit"}
        />
      </CardContent>
    </Card>
  );
}
