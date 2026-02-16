"use client";

import type React from "react";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "./image-upload";
import { SpeciesIdentificationTipDialog } from "@/components/species-identification-tip-dialog";
import type { Species, SpeciesImage } from "@/lib/types";
import { uploadSpeciesImage } from "@/lib/firebase/firestore-helpers";
import { useToast } from "@/hooks/use-toast";
import {
  getLocalizedText,
  getSpeciesImageUrl,
} from "@/lib/content/content-display";
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

/** Tabbed form for creating or editing species metadata, images, and identification tips. */
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
  const [identificationTips, setIdentificationTips] = useState<string[]>(
    species?.data.identificationTips ?? [],
  );
  const [isTipDialogOpen, setIsTipDialogOpen] = useState(false);
  const [editingTipIndex, setEditingTipIndex] = useState<number | null>(null);
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
  const { toast } = useToast();
  const testSelectionError = images.length > 0 && testImageIds.length === 0;
  const editingTipValue =
    editingTipIndex !== null ? (identificationTips[editingTipIndex] ?? "") : "";

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
          title: "Image uploaded",
          description: "Image has been uploaded successfully",
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
        title: "Error",
        description: "Failed to upload image",
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
          title: "Select test images",
          description: "Choose at least one image to use in tests.",
          variant: "destructive",
        });
        return;
      }
      if (!scientificName.trim()) {
        setActiveTab("information");
        toast({
          title: "Scientific name is required",
          description: "Enter a scientific name before saving.",
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
      const normalizedIdentificationTips = identificationTips
        .map((tip) => tip.trim())
        .filter((tip) => tip.length > 0);
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
      if (normalizedIdentificationTips.length > 0) {
        detail.identificationTips = normalizedIdentificationTips;
      } else {
        delete detail.identificationTips;
      }

      await onSubmit({
        data: detail,
        testImageIds:
          testImageIds.length > 0
            ? testImageIds
            : images.map((image) => image.id),
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save species",
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

  const handleTipDialogOpenChange = (open: boolean) => {
    setIsTipDialogOpen(open);
    if (!open) {
      setEditingTipIndex(null);
    }
  };

  const handleAddTip = () => {
    setEditingTipIndex(null);
    setIsTipDialogOpen(true);
  };

  const handleEditTip = (index: number) => {
    setEditingTipIndex(index);
    setIsTipDialogOpen(true);
  };

  const handleDeleteTip = (index: number) => {
    setIdentificationTips((prev) =>
      prev.filter((_, tipIndex) => tipIndex !== index),
    );
  };

  const handleSaveTip = (value: string) => {
    setIdentificationTips((prev) => {
      if (editingTipIndex === null) {
        return [...prev, value];
      }
      return prev.map((tip, index) =>
        index === editingTipIndex ? value : tip,
      );
    });
    handleTipDialogOpenChange(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{species ? "Edit Species" : "Create New Species"}</CardTitle>
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
              Information
            </Button>
            <Button
              type="button"
              variant={activeTab === "pictures" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("pictures")}
            >
              Pictures
            </Button>
            <Button
              type="button"
              variant={activeTab === "identification" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("identification")}
            >
              Identification
            </Button>
          </div>

          {activeTab === "information" ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="scientificName">Scientific Name *</Label>
                <Input
                  id="scientificName"
                  value={scientificName}
                  onChange={(e) => setScientificName(e.target.value)}
                  placeholder="e.g., Vulpes vulpes"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="finnishName">Finnish Name</Label>
                  <Input
                    id="finnishName"
                    value={finnishName}
                    onChange={(e) => setFinnishName(e.target.value)}
                    placeholder="e.g., Kettu"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="englishName">English Name</Label>
                  <Input
                    id="englishName"
                    value={englishName}
                    onChange={(e) => setEnglishName(e.target.value)}
                    placeholder="e.g., Red Fox"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swedishName">Swedish Name</Label>
                  <Input
                    id="swedishName"
                    value={swedishName}
                    onChange={(e) => setSwedishName(e.target.value)}
                    placeholder="e.g., Rodrav"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="descriptionFi">Description (FI)</Label>
                  <Textarea
                    id="descriptionFi"
                    value={descriptionFi}
                    onChange={(e) => setDescriptionFi(e.target.value)}
                    placeholder="Enter species description..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descriptionEn">Description (EN)</Label>
                  <Textarea
                    id="descriptionEn"
                    value={descriptionEn}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    placeholder="Enter species description..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descriptionSv">Description (SV)</Label>
                  <Textarea
                    id="descriptionSv"
                    value={descriptionSv}
                    onChange={(e) => setDescriptionSv(e.target.value)}
                    placeholder="Enter species description..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "pictures" ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Images</Label>
                <ImageUpload
                  images={images}
                  onImagesChange={setImages}
                  onFileUpload={handleFileUpload}
                />
              </div>

              <div className="space-y-2">
                <Label>Test Images</Label>
                <p className="text-sm text-muted-foreground">
                  Select which images can appear in tests. Cards always show all
                  images.
                </p>
                {images.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add images to enable test selection.
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
                                alt={`Species image ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex items-center justify-between p-2 text-xs text-muted-foreground">
                              <span>Image {index + 1}</span>
                              <span
                                className={
                                  isChecked ? "text-foreground" : undefined
                                }
                              >
                                {isChecked ? "Test" : "Excluded"}
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
                    Select at least one image for tests.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "identification" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Label>Identification Tips</Label>
                <Button type="button" size="sm" onClick={handleAddTip}>
                  Add Tip
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Tips are shown in the learning page identification tab.
              </p>
              {identificationTips.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  No identification tips added yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {identificationTips.map((tip, index) => (
                    <div
                      key={`${tip}-${index}`}
                      className="flex items-start justify-between gap-2 rounded-md border border-border px-3 py-2"
                    >
                      <p className="text-sm whitespace-pre-wrap">{tip}</p>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTip(index)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTip(index)}
                        >
                          Delete
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
                ? "Saving..."
                : species
                  ? "Update Species"
                  : "Create Species"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
        <SpeciesIdentificationTipDialog
          open={isTipDialogOpen}
          onOpenChange={handleTipDialogOpenChange}
          initialValue={editingTipValue}
          onSave={handleSaveTip}
          mode={editingTipIndex === null ? "create" : "edit"}
        />
      </CardContent>
    </Card>
  );
}
