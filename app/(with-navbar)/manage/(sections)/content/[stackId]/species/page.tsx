"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/loading-spinner";
import { DraggableHorizontalItem } from "@/components/draggable-horizontal-item";
import { ManageSpeciesCardHorizontalContent } from "@/components/manage-species-card-horizontal-content";
import { useToast } from "@/hooks/use-toast";
import { logFirestoreError } from "@/lib/utils";
import {
  getSpecies,
  getStack,
  deleteSpecies,
  updateSpecies,
  updateStackSpeciesOrder,
} from "@/lib/firebase/firestore-helpers";
import type { Species, Stack } from "@/lib/types";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { getLocalizedText } from "@/lib/content/content-display";
import {
  loadLocalPreferences,
  toLanguageCode,
  updateLocalPreferences,
  type ManageSpeciesViewVariant,
} from "@/lib/local-preferences";
import { useLanguagePreference } from "@/lib/language-context";

export default function ManageSpeciesPage() {
  const { language } = useLanguagePreference();
  const preferredLanguage = toLanguageCode(language);
  const params = useParams();
  const stackIdParam = params.stackId as string;
  const stackId = decodeURIComponent(stackIdParam);
  const { toast } = useToast();
  const router = useRouter();

  const [stack, setStack] = useState<Stack | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [cardVariant, setCardVariant] =
    useState<ManageSpeciesViewVariant>("minimal");
  const [localPreferencesLoaded, setLocalPreferencesLoaded] = useState(false);

  useEffect(() => {
    void loadData();
  }, [stackId]);

  useEffect(() => {
    const storedVariant = loadLocalPreferences().manageSpecies?.viewVariant;
    if (storedVariant === "minimal" || storedVariant === "detailed") {
      setCardVariant(storedVariant);
    }
    setLocalPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!localPreferencesLoaded || typeof window === "undefined") return;
    updateLocalPreferences((storedPreferences) => ({
      ...storedPreferences,
      manageSpecies: {
        ...storedPreferences.manageSpecies,
        viewVariant: cardVariant,
      },
    }));
  }, [cardVariant, localPreferencesLoaded]);

  const loadData = async () => {
    try {
      const [stackData, speciesData] = await Promise.all([
        getStack(stackId, { includeHidden: true }),
        getSpecies(stackId, { includeHidden: true }),
      ]);
      setStack(stackData);
      setSpecies(speciesData);
    } catch (error) {
      logFirestoreError("Failed to load species/stack", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Species) => {
    router.push(`/manage/content/${stackId}/species/${item.id}`);
  };

  const handleToggleQuizImage = async (target: Species, imageId: string) => {
    const imageIds = target.data.images?.map((image) => image.id) ?? [];
    if (imageIds.length === 0) return;

    const currentEnabled =
      target.quizImageIds && target.quizImageIds.length > 0
        ? target.quizImageIds
        : imageIds;
    const isEnabled = currentEnabled.includes(imageId);

    if (isEnabled && currentEnabled.length === 1) {
      toast({
        title: "Select quiz images",
        description: "At least one image must remain enabled for quizzes.",
        variant: "destructive",
      });
      return;
    }

    const nextEnabled = isEnabled
      ? currentEnabled.filter((id) => id !== imageId)
      : [...currentEnabled, imageId];
    const orderedEnabled = imageIds.filter((id) => nextEnabled.includes(id));
    const previousEnabled = target.quizImageIds;

    setSpecies((prev) =>
      prev.map((item) =>
        item.id === target.id
          ? { ...item, quizImageIds: orderedEnabled }
          : item,
      ),
    );

    try {
      await updateSpecies(target.id, { quizImageIds: orderedEnabled });
    } catch (error) {
      logFirestoreError("Failed to update quiz images", error);
      setSpecies((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? { ...item, quizImageIds: previousEnabled }
            : item,
        ),
      );
      toast({
        title: "Error",
        description: "Failed to update quiz images",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this species?")) return;

    try {
      await deleteSpecies(id);
      toast({
        title: "Success",
        description: "Species deleted successfully",
      });
      loadData();
    } catch (error) {
      logFirestoreError("Failed to delete species", error);
      toast({
        title: "Error",
        description: "Failed to delete species",
        variant: "destructive",
      });
    }
  };

  const handleToggleSpeciesVisibility = async (item: Species) => {
    const nextHidden = !item.isHidden;
    setSpecies((prev) =>
      prev.map((entry) =>
        entry.id === item.id ? { ...entry, isHidden: nextHidden } : entry,
      ),
    );
    try {
      await updateSpecies(item.id, { isHidden: nextHidden });
      toast({
        title: "Success",
        description: nextHidden
          ? "Species hidden from learners"
          : "Species is now public",
      });
    } catch (error) {
      logFirestoreError("Failed to toggle species visibility", error);
      setSpecies((prev) =>
        prev.map((entry) =>
          entry.id === item.id ? { ...entry, isHidden: item.isHidden } : entry,
        ),
      );
      toast({
        title: "Error",
        description: "Failed to update species visibility",
        variant: "destructive",
      });
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSpecies = [...species];
    const draggedSpecies = newSpecies[draggedIndex];
    newSpecies.splice(draggedIndex, 1);
    newSpecies.splice(index, 0, draggedSpecies);

    setDraggedIndex(index);
    setSpecies(newSpecies);
  };

  const handleDragEnd = async () => {
    if (draggedIndex !== null) {
      const reorderedSpeciesIds = species.map((s) => s.id);
      await updateStackSpeciesOrder(stackId, reorderedSpeciesIds);
      toast({
        title: "Success",
        description: "Species reordered successfully",
      });
    }
    setDraggedIndex(null);
  };

  const handleSortAlphabetically = async () => {
    if (species.length < 2) return;
    const sortedSpecies = [...species].sort((a, b) =>
      (a.data.scientificName ?? "").localeCompare(
        b.data.scientificName ?? "",
        undefined,
        { sensitivity: "base" },
      ),
    );
    setSpecies(sortedSpecies);

    try {
      const reorderedSpeciesIds = sortedSpecies.map((item) => item.id);
      await updateStackSpeciesOrder(stackId, reorderedSpeciesIds);
      toast({
        title: "Success",
        description: "Species sorted alphabetically",
      });
    } catch (error) {
      logFirestoreError("Failed to sort species", error);
      toast({
        title: "Error",
        description: "Failed to sort species",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="editor">
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
          <LoadingSpinner className="py-12" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="editor">
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                {stack
                  ? getLocalizedText(stack.data.name, preferredLanguage)
                  : "Manage Species"}
              </h1>
              <p className="text-muted-foreground">
                Add and edit species in this stack
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex rounded-md border border-border bg-background p-1 gap-1">
                <Button
                  size="sm"
                  variant={cardVariant === "minimal" ? "secondary" : "ghost"}
                  className="h-7 px-3"
                  onClick={() => setCardVariant("minimal")}
                >
                  Minimal
                </Button>
                <Button
                  size="sm"
                  variant={cardVariant === "detailed" ? "secondary" : "ghost"}
                  className="h-7 px-3"
                  onClick={() => setCardVariant("detailed")}
                >
                  Detailed
                </Button>
              </div>
              <Button
                variant="secondary"
                onClick={handleSortAlphabetically}
                disabled={species.length < 2}
              >
                Sort A-Z
              </Button>
              <Button asChild>
                <Link href={`/manage/content/${stackId}/species/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Species
                </Link>
              </Button>
            </div>
          </div>

          <div
            className={
              cardVariant === "detailed"
                ? "mx-auto space-y-3"
                : "columns-1 gap-x-5 md:columns-2 xl:columns-3"
            }
          >
            {species.map((item, index) => {
              return (
                <DraggableHorizontalItem
                  key={item.id}
                  index={index}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  variant={cardVariant}
                  className={
                    cardVariant === "detailed"
                      ? "w-full"
                      : "mb-3 break-inside-avoid"
                  }
                >
                  <ManageSpeciesCardHorizontalContent
                    species={item}
                    variant={cardVariant}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleVisibility={handleToggleSpeciesVisibility}
                    onToggleQuizImage={handleToggleQuizImage}
                  />
                </DraggableHorizontalItem>
              );
            })}

            {species.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p className="mb-4">No species in this stack yet</p>
                  <Button asChild>
                    <Link href={`/manage/content/${stackId}/species/new`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Species
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
