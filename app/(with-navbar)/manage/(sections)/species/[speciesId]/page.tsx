"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SpeciesForm } from "@/components/species-form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import {
  createLearningItem,
  getLearningItemById,
  updateLearningItem,
} from "@/lib/firebase/firestore-helpers";
import { useI18n } from "@/lib/i18n";
import type { Species } from "@/lib/types";
import { logFirestoreError } from "@/lib/utils";

/** Create or edit canonical learning items outside stack-specific linking views. */
export default function ManageCanonicalSpeciesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const speciesId = decodeURIComponent(params.speciesId as string);
  const isNew = speciesId === "new";

  const [species, setSpecies] = useState<Species | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        return;
      }
      try {
        setSpecies(isNew ? null : await getLearningItemById(speciesId));
      } catch (error) {
        logFirestoreError("Failed to load canonical learning item", error);
        toast({
          title: t("auth.errorTitle"),
          description: t("manage.speciesInventory.toast.loadError"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [isNew, speciesId, t, toast, user]);

  const handleSubmit = async (payload: {
    data: Species["data"];
    testImageIds: string[];
  }) => {
    if (!user) {
      return;
    }

    try {
      if (isNew) {
        await createLearningItem(
          {
            data: payload.data,
            testImageIds: payload.testImageIds,
            ownerId: user.uid,
          },
          [],
        );
        toast({
          title: t("manage.speciesInventory.toast.createSuccessTitle"),
          description: t(
            "manage.speciesInventory.toast.createSuccessDescription",
          ),
        });
        router.push("/manage/species");
        return;
      }

      await updateLearningItem(speciesId, {
        data: payload.data,
        testImageIds: payload.testImageIds,
      });
      toast({
        title: t("manage.speciesInventory.toast.updateSuccessTitle"),
        description: t(
          "manage.speciesInventory.toast.updateSuccessDescription",
        ),
      });
      router.push("/manage/species");
    } catch (error) {
      logFirestoreError("Failed to save canonical learning item", error);
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

  if (!isNew && !species) {
    return (
      <ProtectedRoute requiredRole="editor">
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
          <main className="container mx-auto px-4 py-8">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/manage/species">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("manage.speciesInventory.backToSpecies")}
              </Link>
            </Button>
            <div className="rounded-lg border border-border bg-background p-6">
              <p className="text-muted-foreground">
                {t("manage.speciesInventory.notFound")}
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
            <Link href="/manage/species">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("manage.speciesInventory.backToSpecies")}
            </Link>
          </Button>
          <SpeciesForm
            species={species ?? undefined}
            stackId=""
            onSubmit={handleSubmit}
            onCancel={() => router.push("/manage/species")}
          />
        </main>
      </div>
    </ProtectedRoute>
  );
}
