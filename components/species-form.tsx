"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "./image-upload";
import type { Species, SpeciesImage } from "@/lib/types";
import { uploadSpeciesImage } from "@/lib/firebase/firestore-helpers";
import { useToast } from "@/hooks/use-toast";
import type { PinkkaSpeciesDetail } from "@/lib/pinkka/pinkka-api";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";

/** Props for creating or editing a species. */
interface SpeciesFormProps {
  /** Optional existing species to edit. */
  species?: Species;
  /** Parent stack id for new species. */
  stackId: string;
  /** Submit handler for form data. */
  onSubmit: (data: PinkkaSpeciesDetail) => Promise<void>;
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
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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
      const detail: PinkkaSpeciesDetail = {
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

      await onSubmit(detail);
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
