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
import { uploadSpeciesImage } from "@/lib/firestore-helpers";
import { useToast } from "@/hooks/use-toast";

/** Props for creating or editing a species. */
interface SpeciesFormProps {
  /** Optional existing species to edit. */
  species?: Species;
  /** Parent stack id for new species. */
  stackId: string;
  /** Submit handler for form data. */
  onSubmit: (data: Partial<Species>) => Promise<void>;
  /** Cancel handler for dismissing the form. */
  onCancel: () => void;
}

/** Form for creating or editing species metadata and images. */
export function SpeciesForm({
  species,
  stackId,
  onSubmit,
  onCancel,
}: SpeciesFormProps) {
  const [scientificName, setScientificName] = useState(
    species?.scientificName || "",
  );
  const [finnishName, setFinnishName] = useState(species?.finnishName || "");
  const [englishName, setEnglishName] = useState(species?.englishName || "");
  const [description, setDescription] = useState(species?.description || "");
  const [images, setImages] = useState<SpeciesImage[]>(species?.images || []);
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
            url: e.target?.result as string,
            order: images.length,
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
      await onSubmit({
        scientificName,
        finnishName,
        englishName,
        description,
        images,
        stackId,
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

          <div className="grid sm:grid-cols-2 gap-4">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter species description..."
              rows={4}
            />
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
