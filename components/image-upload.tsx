"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, GripVertical } from "lucide-react";
import type { SpeciesImage } from "@/lib/types";
import { getSpeciesImageUrl } from "@/lib/content/content-display";
import Image from "next/image";

/** Props for the image upload and reorder widget. */
interface ImageUploadProps {
  /** Current list of images. */
  images: SpeciesImage[];
  /** Callback when the image list changes. */
  onImagesChange: (images: SpeciesImage[]) => void;
  /** Handler for uploading a selected file. */
  onFileUpload: (file: File) => void;
}

/** Upload control with sortable image previews. */
export function ImageUpload({
  images,
  onImagesChange,
  onFileUpload,
}: ImageUploadProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        onFileUpload(file);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);

    setDraggedIndex(index);
    onImagesChange(newImages);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" asChild>
          <label className="cursor-pointer">
            <Upload className="mr-2 h-4 w-4" />
            Upload Images
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </Button>
        <p className="text-sm text-muted-foreground">Drag to reorder</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <Card
            key={image.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className="relative group cursor-move hover:shadow-md transition-shadow py-0"
          >
            <div className="aspect-square relative">
              <Image
                src={getSpeciesImageUrl(image) || "/placeholder.svg"}
                alt={`Species image ${index + 1}`}
                fill
                className="object-contain"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-t-sm flex items-center justify-center">
                <GripVertical className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleRemoveImage(index)}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="p-2 text-center text-xs text-muted-foreground">
              Image {index + 1}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
