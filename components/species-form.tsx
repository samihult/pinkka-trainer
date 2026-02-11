"use client";

import type React from "react";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "./image-upload";
import type { Species, SpeciesImage } from "@/lib/types";
import { uploadSpeciesImage } from "@/lib/firebase/firestore-helpers";
import { useToast } from "@/hooks/use-toast";
import {
  getLocalizedText,
  getSpeciesImageUrl,
} from "@/lib/content/content-display";
import Image from "next/image";

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
    /** Image ids enabled for quiz prompts. */
    quizImageIds: string[];
  }) => Promise<void>;
  /** Cancel handler for dismissing the form. */
  onCancel: () => void;
}

/** Form for creating or editing species metadata and images. */
export function SpeciesForm({
  species,
  stackId: _stackId,
  onSubmit,
  onCancel,
}: SpeciesFormProps) {
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
  const [quizImageIds, setQuizImageIds] = useState<string[]>(() => {
    const imageIds = (species?.data.images || []).map((image) => image.id);
    const existingIds = species?.quizImageIds?.filter((id) =>
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
  const quizSelectionError = images.length > 0 && quizImageIds.length === 0;

  useEffect(() => {
    const imageIds = images.map((image) => image.id);
    const previousImageIds = previousImageIdsRef.current;

    setQuizImageIds((prev) => {
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
      if (quizSelectionError) {
        toast({
          title: "Select quiz images",
          description: "Choose at least one image to use in quizzes.",
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
      const detail: Species["data"] = {
        ...(species?.data || {}),
        taxonId: species?.data.taxonId || `local-${Date.now()}`,
        scientificName,
        vernacularName,
        description: Object.keys(descriptionBody).length
          ? [
              {
                title: descriptionTitle,
                body: descriptionBody,
                predicate: descriptionEntry?.predicate ?? "description",
              },
            ]
          : undefined,
        images,
      };

      await onSubmit({
        data: detail,
        quizImageIds:
          quizImageIds.length > 0
            ? quizImageIds
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

  const handleQuizImageToggle = (imageId: string) => {
    setQuizImageIds((prev) => {
      const isEnabled = prev.includes(imageId);
      if (isEnabled) {
        return prev.filter((id) => id !== imageId);
      }
      const next = [...prev, imageId];
      return images.map((image) => image.id).filter((id) => next.includes(id));
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{species ? "Edit Species" : "Create New Species"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="space-y-2">
            <Label>Images</Label>
            <ImageUpload
              images={images}
              onImagesChange={setImages}
              onFileUpload={handleFileUpload}
            />
          </div>

          <div className="space-y-2">
            <Label>Quiz Images</Label>
            <p className="text-sm text-muted-foreground">
              Select which images can appear in quizzes. Flashcards always show
              all images.
            </p>
            {images.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add images to enable quiz selection.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {images.map((image, index) => {
                  const imageId = image.id;
                  const inputId = `quiz-image-${imageId}`;
                  const isChecked = quizImageIds.includes(imageId);
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
                        onChange={() => handleQuizImageToggle(imageId)}
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
                            {isChecked ? "Quiz" : "Excluded"}
                          </span>
                        </div>
                      </Card>
                    </label>
                  );
                })}
              </div>
            )}
            {quizSelectionError && (
              <p className="text-sm text-destructive">
                Select at least one image for quizzes.
              </p>
            )}
          </div>

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
      </CardContent>
    </Card>
  );
}
