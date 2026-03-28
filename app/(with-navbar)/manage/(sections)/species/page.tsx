"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getLocalizedText } from "@/lib/content/content-display";
import { getLearningItems } from "@/lib/firebase/firestore-helpers";
import { useI18n } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";
import type { Species } from "@/lib/types";
import { logFirestoreError } from "@/lib/utils";

type SpeciesGroup = {
  familyLabel: string;
  genusLabel: string;
  species: Species[];
};

function getTaxonomyLabel(
  species: Species,
  rank: "family" | "genus",
  language: "fi" | "en" | "sv",
): string | null {
  const rankKey = rank === "family" ? "MX.family" : "MX.genus";
  const taxonomyEntry = species.data.taxonomy?.find(
    (entry) => entry.rank === rankKey,
  );
  const vernacular = getLocalizedText(
    taxonomyEntry?.vernacularName ?? undefined,
    language,
  );
  const scientific =
    taxonomyEntry?.scientificName ??
    (rank === "family"
      ? species.data.familyScientificName
      : species.data.genusScientificName);
  return vernacular || scientific || null;
}

/** Render the canonical learning-item inventory grouped by taxonomy. */
export default function ManageSpeciesInventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguagePreference();
  const { t } = useI18n();
  const preferredLanguage = toLanguageCode(language);
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        return;
      }
      try {
        setSpecies(await getLearningItems(undefined, { includeHidden: true }));
      } catch (error) {
        logFirestoreError("Failed to load canonical learning items", error);
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
  }, [t, toast, user]);

  const groups = useMemo(() => {
    const grouped = new Map<string, SpeciesGroup>();
    for (const item of species) {
      const familyLabel =
        getTaxonomyLabel(item, "family", preferredLanguage) ??
        t("manage.speciesInventory.unclassifiedFamily");
      const genusLabel =
        getTaxonomyLabel(item, "genus", preferredLanguage) ??
        t("manage.speciesInventory.unclassifiedGenus");
      const key = `${familyLabel}__${genusLabel}`;
      const existingGroup = grouped.get(key);
      if (existingGroup) {
        existingGroup.species.push(item);
        continue;
      }
      grouped.set(key, {
        familyLabel,
        genusLabel,
        species: [item],
      });
    }

    return [...grouped.values()]
      .map((group) => ({
        ...group,
        species: [...group.species].sort((left, right) =>
          left.data.scientificName.localeCompare(right.data.scientificName),
        ),
      }))
      .sort(
        (left, right) =>
          left.familyLabel.localeCompare(right.familyLabel) ||
          left.genusLabel.localeCompare(right.genusLabel),
      );
  }, [preferredLanguage, species, t]);

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
        <main className="container mx-auto space-y-6 px-4 py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">
                {t("manage.speciesInventory.title")}
              </h1>
              <p className="max-w-3xl text-muted-foreground">
                {t("manage.speciesInventory.description")}
              </p>
            </div>
            <Button asChild>
              <Link href="/manage/species/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("manage.speciesInventory.addSpecies")}
              </Link>
            </Button>
          </div>

          {groups.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t("manage.speciesInventory.empty")}
              </CardContent>
            </Card>
          ) : (
            groups.map((group) => (
              <Card key={`${group.familyLabel}-${group.genusLabel}`}>
                <CardHeader className="space-y-1">
                  <CardTitle>{group.familyLabel}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {group.genusLabel}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.species.map((item) => {
                    const vernacularName = getLocalizedText(
                      item.data.vernacularName,
                      preferredLanguage,
                    );
                    return (
                      <Link
                        key={item.id}
                        href={`/manage/species/${item.id}`}
                        className="flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-accent"
                      >
                        <div>
                          <p className="font-medium">
                            {item.data.scientificName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {vernacularName ||
                              t("manage.speciesInventory.noVernacularName")}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {item.isHidden
                            ? t("manage.speciesInventory.hidden")
                            : t("manage.speciesInventory.visible")}
                        </div>
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            ))
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
