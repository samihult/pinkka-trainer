"use client";

/** Canonical species inventory rendered as a fixed-rank taxonomy hierarchy. */

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SpeciesTaxonomyTree } from "@/components/species-taxonomy-tree";
import { VerdantScholarInput } from "@/components/verdant-scholar/atoms/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildSpeciesTaxonomyTree,
  type SpeciesTaxonomyRank,
} from "@/lib/content/species-taxonomy-tree";
import { useAuth } from "@/lib/auth-context";
import { getLocalizedText } from "@/lib/content/content-display";
import { useToast } from "@/hooks/use-toast";
import { getLearningItems } from "@/lib/firebase/firestore-helpers";
import { useI18n } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";
import type { Species } from "@/lib/types";
import { logFirestoreError } from "@/lib/utils";

function getSpeciesSearchTokens(
  species: Species,
  preferredLanguage: "fi" | "en" | "sv",
) {
  return [
    species.data.scientificName,
    getLocalizedText(species.data.vernacularName, preferredLanguage),
    species.data.genusScientificName,
    species.data.familyScientificName,
    getLocalizedText(species.data.genusVernacularName, preferredLanguage),
    getLocalizedText(species.data.familyVernacularName, preferredLanguage),
    ...(species.data.taxonomy?.flatMap((entry) => [
      entry.scientificName,
      getLocalizedText(entry.vernacularName ?? undefined, preferredLanguage),
    ]) ?? []),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLocaleLowerCase());
}

/** Render the canonical learning-item inventory grouped by taxonomy. */
export default function ManageSpeciesInventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguagePreference();
  const { t } = useI18n();
  const preferredLanguage = toLanguageCode(language);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [releaseFilterFocusDemand, setReleaseFilterFocusDemand] =
    useState(false);
  const focusedNodeId = searchParams.get("item") ?? undefined;
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const taxonomyRankLabels = useMemo<Record<SpeciesTaxonomyRank, string>>(
    () => ({
      domain: t("manage.speciesInventory.rank.domain"),
      kingdom: t("manage.speciesInventory.rank.kingdom"),
      phylum: t("manage.speciesInventory.rank.phylum"),
      class: t("manage.speciesInventory.rank.class"),
      order: t("manage.speciesInventory.rank.order"),
      family: t("manage.speciesInventory.rank.family"),
      genus: t("manage.speciesInventory.rank.genus"),
      species: t("manage.speciesInventory.rank.species"),
    }),
    [t],
  );

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

  const filteredSpecies = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return species;
    }

    return species.filter((item) =>
      getSpeciesSearchTokens(item, preferredLanguage).some((token) =>
        token.includes(normalizedQuery),
      ),
    );
  }, [deferredSearchQuery, preferredLanguage, species]);

  const activeFocusNodeId =
    deferredSearchQuery.trim().length > 0
      ? filteredSpecies[0]?.id
      : focusedNodeId;
  const isFilterActive = searchQuery.trim().length > 0;

  const taxonomyTree = useMemo(
    () =>
      buildSpeciesTaxonomyTree({
        species: filteredSpecies,
        preferredLanguage,
        focusedNodeId: activeFocusNodeId,
        getUnclassifiedLabel: (rank) =>
          t("manage.speciesInventory.unclassifiedRank", {
            rank: taxonomyRankLabels[rank].toLocaleLowerCase(),
          }),
      }),
    [
      activeFocusNodeId,
      filteredSpecies,
      preferredLanguage,
      t,
      taxonomyRankLabels,
    ],
  );

  const handleNodeSelect = (nodeId: string) => {
    setReleaseFilterFocusDemand(true);
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("item", nodeId);
    router.replace(`${pathname}?${nextSearchParams.toString()}`, {
      scroll: false,
    });
  };

  const handleSearchChange = (value: string) => {
    setReleaseFilterFocusDemand(false);
    setSearchQuery(value);
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
            <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[22rem]">
              <VerdantScholarInput
                id="species-inventory-search"
                name="species-inventory-search"
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setReleaseFilterFocusDemand(false);
                    setSearchQuery("");
                  }
                }}
                placeholder={t("manage.speciesInventory.searchPlaceholder")}
                aria-label={t("manage.speciesInventory.searchPlaceholder")}
              />
              <div className="flex justify-end">
                <Button asChild>
                  <Link href="/manage/species/new">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("manage.speciesInventory.addSpecies")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {filteredSpecies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {searchQuery.trim().length > 0
                  ? t("manage.speciesInventory.searchEmpty")
                  : t("manage.speciesInventory.empty")}
              </CardContent>
            </Card>
          ) : (
            <SpeciesTaxonomyTree
              nodes={taxonomyTree}
              rankLabels={taxonomyRankLabels}
              noVernacularNameLabel={t(
                "manage.speciesInventory.noVernacularName",
              )}
              hiddenLabel={t("manage.speciesInventory.hidden")}
              visibleLabel={t("manage.speciesInventory.visible")}
              focusNodeId={activeFocusNodeId}
              highlightedNodeId={isFilterActive ? activeFocusNodeId : undefined}
              highlightQuery={isFilterActive ? searchQuery : undefined}
              autoFocusNode={!isFilterActive || releaseFilterFocusDemand}
              onNodeSelect={handleNodeSelect}
              editLeafLabel={t("manage.speciesForm.action.editHint")}
            />
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
