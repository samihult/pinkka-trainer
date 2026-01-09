"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SpeciesForm } from "@/components/species-form";
import { LoadingSpinner } from "@/components/loading-spinner";
import { DraggableHorizontalItem } from "@/components/draggable-horizontal-item";
import { ManageSpeciesCardHorizontalContent } from "@/components/manage-species-card-horizontal-content";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { logFirestoreError } from "@/lib/utils";
import {
  getSpecies,
  getStack,
  createSpecies,
  updateSpecies,
  deleteSpecies,
  updateStackSpeciesOrder,
} from "@/lib/firebase/firestore-helpers";
import type { Species, Stack } from "@/lib/types";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import type { PinkkaSpeciesDetail } from "@/lib/pinkka/pinkka-api";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";

export default function ManageSpeciesPage() {
  const params = useParams();
  const router = useRouter();
  const stackId = params.stackId as string;
  const { user } = useAuth();
  const { toast } = useToast();

  const [stack, setStack] = useState<Stack | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSpecies, setEditingSpecies] = useState<Species | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    void loadData();
  }, [stackId]);

  const loadData = async () => {
    try {
      const [stackData, speciesData] = await Promise.all([
        getStack(stackId),
        getSpecies(stackId),
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

  const handleCreate = async (data: PinkkaSpeciesDetail) => {
    if (!user) return;

    try {
      await createSpecies(
        {
          data,
          ownerId: user.uid,
        },
        [stackId],
      );
      toast({
        title: "Success",
        description: "Species created successfully",
      });
      setShowForm(false);
      void loadData();
    } catch (error) {
      logFirestoreError("Failed to create species", error);
      throw error;
    }
  };

  const handleUpdate = async (data: PinkkaSpeciesDetail) => {
    if (!editingSpecies) return;

    try {
      await updateSpecies(editingSpecies.id, { data });
      toast({
        title: "Success",
        description: "Species updated successfully",
      });
      setEditingSpecies(null);
      void loadData();
    } catch (error) {
      logFirestoreError("Failed to update species", error);
      throw error;
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

  if (loading) {
    return (
      <ProtectedRoute requiredRole="editor">
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
          <Navbar />
          <LoadingSpinner className="py-12" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="editor">
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <Navbar />

        <main className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <Button variant="ghost" asChild className="mb-2">
                <Link href="/manage">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Management
                </Link>
              </Button>
              <h1 className="text-3xl font-bold">
                {stack
                  ? getLocalizedText(stack.data.name, "fi")
                  : "Manage Species"}
              </h1>
              <p className="text-muted-foreground">
                Add and edit species in this stack
              </p>
            </div>

            {!showForm && !editingSpecies && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Species
              </Button>
            )}
          </div>

          {(showForm || editingSpecies) && (
            <div className="mb-6">
              <SpeciesForm
                species={editingSpecies || undefined}
                stackId={stackId}
                onSubmit={editingSpecies ? handleUpdate : handleCreate}
                onCancel={() => {
                  setShowForm(false);
                  setEditingSpecies(null);
                }}
              />
            </div>
          )}

          <div className="grid gap-1">
            {species.map((item, index) => {
              return (
                <DraggableHorizontalItem
                  key={item.id}
                  index={index}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  <ManageSpeciesCardHorizontalContent
                    species={item}
                    onEdit={setEditingSpecies}
                    onDelete={handleDelete}
                  />
                </DraggableHorizontalItem>
              );
            })}

            {species.length === 0 && !showForm && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p className="mb-4">No species in this stack yet</p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Species
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
