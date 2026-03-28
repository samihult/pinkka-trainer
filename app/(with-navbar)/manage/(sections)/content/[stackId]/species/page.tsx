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
import { SelectFromListDialog } from "@/components/select-from-list-dialog";
import { useToast } from "@/hooks/use-toast";
import { logFirestoreError } from "@/lib/utils";
import {
  getLearningItems,
  getStack,
  linkLearningItemToStack,
  unlinkLearningItemFromStack,
  updateLearningItem,
  updateStackLearningItemOrder,
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
import { useI18n } from "@/lib/i18n";

export default function ManageSpeciesPage() {
  const { language } = useLanguagePreference();
  const { t } = useI18n();
  const preferredLanguage = toLanguageCode(language);
  const params = useParams();
  const stackIdParam = params.stackId as string;
  const stackId = decodeURIComponent(stackIdParam);
  const { toast } = useToast();
  const router = useRouter();

  const [stack, setStack] = useState<Stack | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);
  const [allSpecies, setAllSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [cardVariant, setCardVariant] =
    useState<ManageSpeciesViewVariant>("minimal");
  const [localPreferencesLoaded, setLocalPreferencesLoaded] = useState(false);
  const [showSpeciesLinkDialog, setShowSpeciesLinkDialog] = useState(false);

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
      const [stackData, speciesData, allSpeciesData] = await Promise.all([
        getStack(stackId, { includeHidden: true }),
        getLearningItems(stackId, { includeHidden: true }),
        getLearningItems(undefined, { includeHidden: true }),
      ]);
      setStack(stackData);
      setSpecies(speciesData);
      setAllSpecies(allSpeciesData);
    } catch (error) {
      logFirestoreError("Failed to load species/stack", error);
      toast({
        title: t("auth.errorTitle"),
        description: t("manage.stackSpecies.toast.loadError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Species) => {
    router.push(`/manage/content/${stackId}/species/${item.id}`);
  };

  const handleToggleTestImage = async (target: Species, imageId: string) => {
    const imageIds = target.data.images?.map((image) => image.id) ?? [];
    if (imageIds.length === 0) return;

    const currentEnabled =
      target.testImageIds && target.testImageIds.length > 0
        ? target.testImageIds
        : imageIds;
    const isEnabled = currentEnabled.includes(imageId);

    if (isEnabled && currentEnabled.length === 1) {
      toast({
        title: t("manage.speciesForm.toast.selectTestImagesTitle"),
        description: t("manage.stackSpecies.toast.keepOneTestImage"),
        variant: "destructive",
      });
      return;
    }

    const nextEnabled = isEnabled
      ? currentEnabled.filter((id) => id !== imageId)
      : [...currentEnabled, imageId];
    const orderedEnabled = imageIds.filter((id) => nextEnabled.includes(id));
    const previousEnabled = target.testImageIds;

    setSpecies((prev) =>
      prev.map((item) =>
        item.id === target.id
          ? { ...item, testImageIds: orderedEnabled }
          : item,
      ),
    );

    try {
      await updateLearningItem(target.id, { testImageIds: orderedEnabled });
    } catch (error) {
      logFirestoreError("Failed to update test images", error);
      setSpecies((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? { ...item, testImageIds: previousEnabled }
            : item,
        ),
      );
      toast({
        title: t("auth.errorTitle"),
        description: t("manage.stackSpecies.toast.testImagesError"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("manage.stackSpecies.confirm.unlink"))) return;

    try {
      await unlinkLearningItemFromStack(stackId, id);
      toast({
        title: t("manage.stackSpecies.toast.unlinkSuccessTitle"),
        description: t("manage.stackSpecies.toast.unlinkSuccessDescription"),
      });
      await loadData();
    } catch (error) {
      logFirestoreError("Failed to delete species", error);
      toast({
        title: t("auth.errorTitle"),
        description: t("manage.stackSpecies.toast.unlinkError"),
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
      await updateLearningItem(item.id, { isHidden: nextHidden });
      toast({
        title: t("manage.stackSpecies.toast.visibilitySuccessTitle"),
        description: nextHidden
          ? t("manage.stackSpecies.toast.visibilityHidden")
          : t("manage.stackSpecies.toast.visibilityVisible"),
      });
    } catch (error) {
      logFirestoreError("Failed to toggle species visibility", error);
      setSpecies((prev) =>
        prev.map((entry) =>
          entry.id === item.id ? { ...entry, isHidden: item.isHidden } : entry,
        ),
      );
      toast({
        title: t("auth.errorTitle"),
        description: t("manage.stackSpecies.toast.visibilityError"),
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
      await updateStackLearningItemOrder(stackId, reorderedSpeciesIds);
      toast({
        title: t("manage.stackSpecies.toast.reorderSuccessTitle"),
        description: t("manage.stackSpecies.toast.reorderSuccessDescription"),
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
      await updateStackLearningItemOrder(stackId, reorderedSpeciesIds);
      toast({
        title: t("manage.stackSpecies.toast.sortSuccessTitle"),
        description: t("manage.stackSpecies.toast.sortSuccessDescription"),
      });
    } catch (error) {
      logFirestoreError("Failed to sort species", error);
      toast({
        title: t("auth.errorTitle"),
        description: t("manage.stackSpecies.toast.sortError"),
        variant: "destructive",
      });
    }
  };

  const availableSpeciesOptions = allSpecies
    .filter(
      (item) => !species.some((linkedSpecies) => linkedSpecies.id === item.id),
    )
    .sort((left, right) =>
      left.data.scientificName.localeCompare(right.data.scientificName),
    )
    .map((item) => ({
      id: item.id,
      label: item.data.scientificName,
      description:
        getLocalizedText(item.data.vernacularName, preferredLanguage) ??
        t("manage.speciesInventory.noVernacularName"),
    }));

  const handleLinkSpecies = async (selectedSpeciesId: string) => {
    try {
      await linkLearningItemToStack(stackId, selectedSpeciesId);
      toast({
        title: t("manage.stackSpecies.toast.linkSuccessTitle"),
        description: t("manage.stackSpecies.toast.linkSuccessDescription"),
      });
      setShowSpeciesLinkDialog(false);
      await loadData();
    } catch (error) {
      logFirestoreError("Failed to link species to stack", error);
      toast({
        title: t("auth.errorTitle"),
        description: t("manage.stackSpecies.toast.linkError"),
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
                  : t("manage.stackSpecies.title")}
              </h1>
              <p className="text-muted-foreground">
                {t("manage.stackSpecies.description")}
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
                  {t("manage.stackSpecies.view.minimal")}
                </Button>
                <Button
                  size="sm"
                  variant={cardVariant === "detailed" ? "secondary" : "ghost"}
                  className="h-7 px-3"
                  onClick={() => setCardVariant("detailed")}
                >
                  {t("manage.stackSpecies.view.detailed")}
                </Button>
              </div>
              <Button
                variant="secondary"
                onClick={handleSortAlphabetically}
                disabled={species.length < 2}
              >
                {t("manage.stackSpecies.sort")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowSpeciesLinkDialog(true)}
                disabled={availableSpeciesOptions.length === 0}
              >
                {t("manage.stackSpecies.linkExisting")}
              </Button>
              <Button asChild>
                <Link href={`/manage/content/${stackId}/species/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("manage.stackSpecies.addSpecies")}
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
                    onToggleTestImage={handleToggleTestImage}
                  />
                </DraggableHorizontalItem>
              );
            })}

            {species.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p className="mb-4">{t("manage.stackSpecies.empty")}</p>
                  <div className="flex justify-center gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => setShowSpeciesLinkDialog(true)}
                      disabled={availableSpeciesOptions.length === 0}
                    >
                      {t("manage.stackSpecies.linkExisting")}
                    </Button>
                    <Button asChild>
                      <Link href={`/manage/content/${stackId}/species/new`}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("manage.stackSpecies.addFirstSpecies")}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <SelectFromListDialog
            open={showSpeciesLinkDialog}
            onOpenChange={setShowSpeciesLinkDialog}
            title={t("manage.stackSpecies.linkDialog.title")}
            description={t("manage.stackSpecies.linkDialog.description")}
            options={availableSpeciesOptions}
            onConfirm={handleLinkSpecies}
            confirmLabel={t("manage.stackSpecies.linkDialog.confirm")}
            cancelLabel={t("manage.stackSpecies.linkDialog.cancel")}
            emptyMessage={t("manage.stackSpecies.linkDialog.empty")}
            listAriaLabel={t("manage.stackSpecies.linkDialog.listAria")}
          />
        </main>
      </div>
    </ProtectedRoute>
  );
}
