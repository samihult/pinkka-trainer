"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SpeciesForm } from "@/components/species-form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { logFirestoreError } from "@/lib/utils";
import {
  createSpecies,
  getSpeciesById,
  getStack,
  updateSpecies,
} from "@/lib/firebase/firestore-helpers";
import type { Species, Stack } from "@/lib/types";
import type { PinkkaSpeciesDetail } from "@/lib/pinkka/pinkka-api";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";

/** Manage a single species within a stack. */
export default function ManageSpeciesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const stackId = params.stackId as string;
  const speciesId = params.speciesId as string;
  const { user } = useAuth();
  const { toast } = useToast();

  const [stack, setStack] = useState<Stack | null>(null);
  const [species, setSpecies] = useState<Species | null>(null);
  const [loading, setLoading] = useState(true);

  const isNew = speciesId === "new";

  useEffect(() => {
    void loadData();
  }, [stackId, speciesId]);

  const loadData = async () => {
    try {
      const [stackData, speciesData] = await Promise.all([
        getStack(stackId, { includeHidden: true }),
        isNew ? Promise.resolve(null) : getSpeciesById(speciesId),
      ]);
      setStack(stackData);
      setSpecies(speciesData);
    } catch (error) {
      logFirestoreError("Failed to load species", error);
      toast({
        title: "Error",
        description: "Failed to load species",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (payload: {
    data: PinkkaSpeciesDetail;
    quizImageIds: string[];
  }) => {
    if (!user) return;

    try {
      if (isNew) {
        await createSpecies(
          {
            data: payload.data,
            quizImageIds: payload.quizImageIds,
            ownerId: user.uid,
          },
          [stackId],
        );
        toast({
          title: "Success",
          description: "Species created successfully",
        });
        router.push(`/manage/content/${stackId}/species`);
        return;
      }

      await updateSpecies(speciesId, {
        data: payload.data,
        quizImageIds: payload.quizImageIds,
      });
      toast({
        title: "Success",
        description: "Species updated successfully",
      });
      void loadData();
    } catch (error) {
      logFirestoreError("Failed to save species", error);
      throw error;
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

  if (!stack || (!isNew && !species)) {
    return (
      <ProtectedRoute requiredRole="editor">
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
          <main className="container mx-auto px-4 py-8">
            <Button variant="ghost" asChild className="mb-4">
              <Link href={`/manage/content/${stackId}/species`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Species
              </Link>
            </Button>
            <div className="rounded-lg border border-border bg-background p-6">
              <p className="text-muted-foreground">
                Species not found for this stack.
              </p>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="editor">
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <main className="container mx-auto px-4 py-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href={`/manage/content/${stackId}/species`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Species
            </Link>
          </Button>

          <div className="mb-6">
            <h1 className="text-3xl font-bold">
              {stack
                ? getLocalizedText(stack.data.name, "fi")
                : "Manage Species"}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? "Add a species" : "Update species details"}
            </p>
          </div>

          <SpeciesForm
            species={species || undefined}
            stackId={stackId}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/manage/content/${stackId}/species`)}
          />
        </main>
      </div>
    </ProtectedRoute>
  );
}
