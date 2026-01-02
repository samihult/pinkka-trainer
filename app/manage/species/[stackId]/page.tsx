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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import {
  getSpecies,
  getStack,
  createSpecies,
  updateSpecies,
  deleteSpecies,
  reorderItems,
} from "@/lib/firestore-helpers";
import type { Species, Stack } from "@/lib/types";
import { ArrowLeft, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Partial<Species>) => {
    if (!user) return;

    try {
      await createSpecies({
        ...(data as Omit<Species, "id" | "createdAt" | "updatedAt">),
        stackId,
        createdBy: user.uid,
        order: species.length,
      });
      toast({
        title: "Success",
        description: "Species created successfully",
      });
      setShowForm(false);
      void loadData();
    } catch (error) {
      throw error;
    }
  };

  const handleUpdate = async (data: Partial<Species>) => {
    if (!editingSpecies) return;

    try {
      await updateSpecies(editingSpecies.id, data);
      toast({
        title: "Success",
        description: "Species updated successfully",
      });
      setEditingSpecies(null);
      void loadData();
    } catch (error) {
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
      const reorderedItems = species.map((s, i) => ({ id: s.id, order: i }));
      await reorderItems("species", reorderedItems);
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
                {stack?.name || "Manage Species"}
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

          <div className="grid gap-4">
            {species.map((item, index) => (
              <Card
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className="cursor-move hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />

                    {item.images && item.images.length > 0 && (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={item.images[0].url || "/placeholder.svg"}
                          alt={item.scientificName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1">
                        {item.scientificName}
                      </h3>
                      {item.finnishName && (
                        <p className="text-muted-foreground">
                          {item.finnishName}
                        </p>
                      )}
                      {item.englishName && (
                        <p className="text-muted-foreground text-sm">
                          {item.englishName}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setEditingSpecies(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

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
