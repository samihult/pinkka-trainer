"use client";

/** Stack-linked species management view with lazy loading for linkable species. */

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  usePathname,
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SpeciesTaxonomyTree } from "@/components/species-taxonomy-tree";
import { SelectFromListDialog } from "@/components/select-from-list-dialog";
import { VerdantScholarInput } from "@/components/verdant-scholar/atoms/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getLocalizedText } from "@/lib/content/content-display";
import { buildSpeciesTaxonomyTree } from "@/lib/content/species-taxonomy-tree";
import {
  getLearningItems,
  getStack,
  linkLearningItemToStack,
} from "@/lib/firebase/firestore-helpers";
import { useI18n } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";
import type { Species, Stack } from "@/lib/types";
import { logFirestoreError } from "@/lib/utils";

function getStackSpeciesSearchTokens(
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

/** Manage the learning items linked to one stack as a taxonomy tree. */
export default function ManageSpeciesPage() {
  const { language } = useLanguagePreference();
  const { t } = useI18n();
  const preferredLanguage = toLanguageCode(language);
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stackIdParam = params.stackId as string;
  const stackId = decodeURIComponent(stackIdParam);
  const { toast } = useToast();
  const focusedNodeId = searchParams.get("item") ?? undefined;
  const searchQuery = searchParams.get("q") ?? "";
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [stack, setStack] = useState<Stack | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);
  const [allSpecies, setAllSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAllSpecies, setLoadingAllSpecies] = useState(false);
  const [allSpeciesLoaded, setAllSpeciesLoaded] = useState(false);
  const [showSpeciesLinkDialog, setShowSpeciesLinkDialog] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [stackData, speciesData] = await Promise.all([
        getStack(stackId, { includeHidden: true }),
        getLearningItems(stackId, { includeHidden: true }),
      ]);
      setStack(stackData);
      setSpecies(speciesData);
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
  }, [stackId, t, toast]);

  const loadAllSpecies = useCallback(async () => {
    if (loadingAllSpecies || allSpeciesLoaded) {
      return;
    }

    setLoadingAllSpecies(true);
    try {
      setAllSpecies(await getLearningItems(undefined, { includeHidden: true }));
      setAllSpeciesLoaded(true);
    } catch (error) {
      logFirestoreError("Failed to load all canonical species", error);
      toast({
        title: t("auth.errorTitle"),
        description: t("manage.stackSpecies.toast.loadError"),
        variant: "destructive",
      });
    } finally {
      setLoadingAllSpecies(false);
    }
  }, [allSpeciesLoaded, loadingAllSpecies, t, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const taxonomyRankLabels = useMemo(
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

  const filteredSpecies = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return species;
    }

    return species.filter((item) =>
      getStackSpeciesSearchTokens(item, preferredLanguage).some((token) =>
        token.includes(normalizedQuery),
      ),
    );
  }, [deferredSearchQuery, preferredLanguage, species]);

  const taxonomyTree = useMemo(
    () =>
      buildSpeciesTaxonomyTree({
        species: filteredSpecies,
        preferredLanguage,
        focusedNodeId,
        getUnclassifiedLabel: (rank) =>
          t("manage.speciesInventory.unclassifiedRank", {
            rank: taxonomyRankLabels[rank].toLocaleLowerCase(),
          }),
      }),
    [filteredSpecies, focusedNodeId, preferredLanguage, t, taxonomyRankLabels],
  );

  const availableSpeciesOptions = useMemo(
    () =>
      allSpecies
        .filter(
          (item) =>
            !species.some((linkedSpecies) => linkedSpecies.id === item.id),
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
        })),
    [allSpecies, preferredLanguage, species, t],
  );

  const updateQueryString = useCallback(
    (entries: Record<string, string | null>) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(entries)) {
        if (value && value.trim().length > 0) {
          nextSearchParams.set(key, value);
        } else {
          nextSearchParams.delete(key);
        }
      }

      const nextQuery = nextSearchParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      updateQueryString({ item: nodeId });
    },
    [updateQueryString],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      updateQueryString({
        q: value,
        item: null,
      });
    },
    [updateQueryString],
  );

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

  const handleLinkDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open && !allSpeciesLoaded) {
        void loadAllSpecies().finally(() => {
          setShowSpeciesLinkDialog(true);
        });
        return;
      }
      setShowSpeciesLinkDialog(open);
    },
    [allSpeciesLoaded, loadAllSpecies],
  );

  const disableLinkExistingAction =
    loadingAllSpecies ||
    (allSpeciesLoaded && availableSpeciesOptions.length === 0);

  if (loading) {
    return (
      <ProtectedRoute requiredRole="editor">
        <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
          <LoadingSpinner className="py-12" />
        </div>
      </ProtectedRoute>
    );
  }

  const stackName = stack
    ? getLocalizedText(stack.data.name, preferredLanguage)
    : t("manage.stackSpecies.title");

  return (
    <ProtectedRoute requiredRole="editor">
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <main className="container mx-auto space-y-6 px-4 py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Button variant="ghost" asChild className="w-fit px-0">
                <Link href="/manage/content">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("manage.stackSpecies.backToStack")}
                </Link>
              </Button>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">{stackName}</h1>
                <p className="max-w-3xl text-muted-foreground">
                  {t("manage.stackSpecies.description")}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[22rem]">
              <VerdantScholarInput
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder={t("manage.stackSpecies.searchPlaceholder")}
                aria-label={t("manage.stackSpecies.searchPlaceholder")}
              />
              <div className="flex flex-wrap items-center gap-3 md:justify-end">
                <Button
                  variant="secondary"
                  onClick={() => handleLinkDialogOpenChange(true)}
                  disabled={disableLinkExistingAction}
                >
                  {loadingAllSpecies ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
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
          </div>

          {filteredSpecies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {searchQuery.trim().length > 0 ? (
                  <p>{t("manage.stackSpecies.searchEmpty")}</p>
                ) : (
                  <>
                    <p className="mb-4">{t("manage.stackSpecies.empty")}</p>
                    <div className="flex justify-center gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => handleLinkDialogOpenChange(true)}
                        disabled={disableLinkExistingAction}
                      >
                        {loadingAllSpecies ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {t("manage.stackSpecies.linkExisting")}
                      </Button>
                      <Button asChild>
                        <Link href={`/manage/content/${stackId}/species/new`}>
                          <Plus className="mr-2 h-4 w-4" />
                          {t("manage.stackSpecies.addFirstSpecies")}
                        </Link>
                      </Button>
                    </div>
                  </>
                )}
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
              getLeafEditHref={(item) =>
                `/manage/content/${stackId}/species/${item.id}`
              }
              focusNodeId={focusedNodeId}
              onNodeSelect={handleNodeSelect}
              editLeafLabel={t("manage.speciesForm.action.editHint")}
            />
          )}

          <SelectFromListDialog
            open={showSpeciesLinkDialog}
            onOpenChange={handleLinkDialogOpenChange}
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
