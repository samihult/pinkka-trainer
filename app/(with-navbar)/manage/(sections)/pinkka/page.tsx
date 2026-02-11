"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { PinkkaExplorer } from "@/components/pinkka/pinkka-explorer";
import { PinkkaImportProgressDialog } from "@/components/pinkka/pinkka-import-progress-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";
import {
  getPinkkaGroupImportStateMap,
  isPinkkaImportInterruptedError,
  type PinkkaImportProgress,
  getPinkkaSpeciesImportStateMap,
  getPinkkaStackImportStateMap,
  importPinkkaGroups,
  importPinkkaSpeciesList,
  importPinkkaStacks,
} from "@/lib/firebase/firestore-helpers";
import { logFirestoreError } from "@/lib/utils";

function parseNumericParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function createEmptyProgressLevel() {
  return {
    completed: 0,
    total: 0,
    currentEntityName: "",
    imageDownloadsCompleted: 0,
    imageDownloadsTotal: 0,
  };
}

function createEmptyPinkkaImportProgress(): PinkkaImportProgress {
  return {
    groups: createEmptyProgressLevel(),
    stacks: createEmptyProgressLevel(),
    species: createEmptyProgressLevel(),
  };
}

/** Admin-facing page for browsing Pinkka content. */
export default function PinkkaContentPage() {
  const { language } = useLanguagePreference();
  const preferredLanguage = toLanguageCode(language);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeImportAction, setActiveImportAction] = useState<
    "import" | "reimport" | "importmissing" | null
  >(null);
  const [isCheckingImportStatus, setIsCheckingImportStatus] = useState(false);
  const [importedSelectedIds, setImportedSelectedIds] = useState<number[]>([]);
  const [reimportableSelectedIds, setReimportableSelectedIds] = useState<
    number[]
  >([]);
  const [incompleteSelectedIds, setIncompleteSelectedIds] = useState<number[]>(
    [],
  );
  const [unimportedSelectedIds, setUnimportedSelectedIds] = useState<number[]>(
    [],
  );
  const [importProgress, setImportProgress] = useState<PinkkaImportProgress>(
    createEmptyPinkkaImportProgress(),
  );
  const [importStatusVersion, setImportStatusVersion] = useState(0);
  const interruptRequestedRef = useRef(false);

  const selectedGroupId = useMemo(
    () => parseNumericParam(searchParams.get("group")),
    [searchParams],
  );
  const selectedStackId = useMemo(
    () =>
      selectedGroupId === null
        ? null
        : parseNumericParam(searchParams.get("stack")),
    [searchParams, selectedGroupId],
  );
  const selectedSpeciesId = useMemo(
    () =>
      selectedStackId === null
        ? null
        : parseNumericParam(searchParams.get("species")),
    [searchParams, selectedStackId],
  );

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    const normalizedGroup =
      selectedGroupId !== null ? String(selectedGroupId) : null;
    const normalizedStack =
      selectedStackId !== null ? String(selectedStackId) : null;
    const normalizedSpecies =
      selectedSpeciesId !== null ? String(selectedSpeciesId) : null;

    if (normalizedGroup) {
      nextParams.set("group", normalizedGroup);
    } else {
      nextParams.delete("group");
    }

    if (normalizedStack) {
      nextParams.set("stack", normalizedStack);
    } else {
      nextParams.delete("stack");
    }

    if (normalizedSpecies) {
      nextParams.set("species", normalizedSpecies);
    } else {
      nextParams.delete("species");
    }

    const currentQuery = searchParams.toString();
    const nextQuery = nextParams.toString();
    if (currentQuery === nextQuery) {
      return;
    }

    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [
    pathname,
    router,
    searchParams,
    selectedGroupId,
    selectedSpeciesId,
    selectedStackId,
  ]);

  const selectedGroupIds = useMemo(
    () => (selectedGroupId !== null ? [selectedGroupId] : []),
    [selectedGroupId],
  );
  const selectedStackIds = useMemo(
    () => (selectedStackId !== null ? [selectedStackId] : []),
    [selectedStackId],
  );
  const selectedSpeciesIds = useMemo(
    () => (selectedSpeciesId !== null ? [selectedSpeciesId] : []),
    [selectedSpeciesId],
  );

  const importTarget = useMemo(() => {
    if (selectedSpeciesId !== null) return "species";
    if (selectedStackId !== null) return "stack";
    if (selectedGroupId !== null) return "group";
    return null;
  }, [selectedGroupId, selectedSpeciesId, selectedStackId]);

  const selectedTargetIds = useMemo(() => {
    if (importTarget === "species") return selectedSpeciesIds;
    if (importTarget === "stack") return selectedStackIds;
    if (importTarget === "group") return selectedGroupIds;
    return [];
  }, [importTarget, selectedGroupIds, selectedSpeciesIds, selectedStackIds]);

  const hasImportedSelection = importedSelectedIds.length > 0;
  const hasReimportableSelection = reimportableSelectedIds.length > 0;
  const hasIncompleteSelection = incompleteSelectedIds.length > 0;
  const hasUnimportedSelection = unimportedSelectedIds.length > 0;
  const hasMixedSelection = hasImportedSelection && hasUnimportedSelection;
  const hasSelection = selectedTargetIds.length > 0;
  const isImporting = activeImportAction !== null;
  const importCount = unimportedSelectedIds.length;
  const importMissingSelectedIds = useMemo(
    () => [...new Set([...unimportedSelectedIds, ...incompleteSelectedIds])],
    [incompleteSelectedIds, unimportedSelectedIds],
  );
  const importMissingCount = importMissingSelectedIds.length;
  const reimportCount = hasMixedSelection
    ? selectedTargetIds.length
    : reimportableSelectedIds.length;
  const showImportButton = hasSelection && !hasImportedSelection;
  const showReimportButton = hasReimportableSelection && !hasIncompleteSelection;

  const importLabels = useMemo(() => {
    if (importTarget === "species") {
      return { title: "Species", singular: "species", plural: "species" };
    }
    if (importTarget === "stack") {
      return { title: "Stacks", singular: "stack", plural: "stacks" };
    }
    if (importTarget === "group") {
      return { title: "Groups", singular: "group", plural: "groups" };
    }
    return { title: "Items", singular: "item", plural: "items" };
  }, [importTarget]);

  useEffect(() => {
    let isMounted = true;

    if (!importTarget || selectedTargetIds.length === 0) {
      setImportedSelectedIds([]);
      setReimportableSelectedIds([]);
      setIncompleteSelectedIds([]);
      setUnimportedSelectedIds([]);
      setIsCheckingImportStatus(false);
      return;
    }

    const checkImportStatus = async () => {
      setIsCheckingImportStatus(true);
      setImportedSelectedIds([]);
      setReimportableSelectedIds([]);
      setIncompleteSelectedIds([]);
      setUnimportedSelectedIds([]);
      try {
        const statusMap =
          importTarget === "group"
            ? await getPinkkaGroupImportStateMap(selectedTargetIds)
            : importTarget === "stack" && selectedGroupId !== null
              ? await getPinkkaStackImportStateMap(
                  selectedGroupId,
                  selectedTargetIds,
                )
              : importTarget === "species" &&
                  selectedGroupId !== null &&
                  selectedStackId !== null
                ? await getPinkkaSpeciesImportStateMap(
                    selectedGroupId,
                    selectedStackId,
                    selectedTargetIds,
                  )
                : {};

        const results = selectedTargetIds.map((id) => ({
          id,
          isImported: statusMap[id]?.isImported === true,
          isIncomplete: statusMap[id]?.isIncomplete === true,
        }));

        if (!isMounted) {
          return;
        }

        setImportedSelectedIds(
          results.filter((item) => item.isImported).map((item) => item.id),
        );
        setReimportableSelectedIds(
          results
            .filter((item) => item.isImported && !item.isIncomplete)
            .map((item) => item.id),
        );
        setIncompleteSelectedIds(
          results.filter((item) => item.isIncomplete).map((item) => item.id),
        );
        setUnimportedSelectedIds(
          results.filter((item) => !item.isImported).map((item) => item.id),
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }
        logFirestoreError("Failed to check Pinkka import status", error);
        setImportedSelectedIds([]);
        setReimportableSelectedIds([]);
        setIncompleteSelectedIds([]);
        setUnimportedSelectedIds(selectedTargetIds);
      } finally {
        if (isMounted) {
          setIsCheckingImportStatus(false);
        }
      }
    };

    void checkImportStatus();

    return () => {
      isMounted = false;
    };
  }, [
    importStatusVersion,
    importTarget,
    selectedGroupId,
    selectedStackId,
    selectedTargetIds,
  ]);

  const handleImport = async () => {
    if (!user || !importTarget) return;
    if (unimportedSelectedIds.length === 0) {
      toast({
        title: "Nothing to import",
        description: "All selected entities are already imported.",
      });
      return;
    }

    setActiveImportAction("import");
    interruptRequestedRef.current = false;
    setImportProgress(createEmptyPinkkaImportProgress());
    try {
      let results = [];
      if (importTarget === "species") {
        results = await importPinkkaSpeciesList(
          unimportedSelectedIds,
          user.uid,
          undefined,
          {
            groupId: selectedGroupId ?? undefined,
            stackId: selectedStackId ?? undefined,
            onProgress: setImportProgress,
            shouldInterrupt: () => interruptRequestedRef.current,
          },
        );
      } else if (importTarget === "stack") {
        results = await importPinkkaStacks(
          unimportedSelectedIds,
          user.uid,
          undefined,
          {
            groupId: selectedGroupId ?? undefined,
            onProgress: setImportProgress,
            shouldInterrupt: () => interruptRequestedRef.current,
          },
        );
      } else {
        results = await importPinkkaGroups(
          unimportedSelectedIds,
          user.uid,
          undefined,
          {
            onProgress: setImportProgress,
            shouldInterrupt: () => interruptRequestedRef.current,
          },
        );
      }
      toast({
        title: "Import complete",
        description: `Imported ${results.length} ${
          results.length === 1 ? importLabels.singular : importLabels.plural
        }.`,
      });
      setImportStatusVersion((prev) => prev + 1);
    } catch (error) {
      if (isPinkkaImportInterruptedError(error)) {
        toast({
          title: "Import interrupted",
          description: "The Pinkka import was interrupted.",
        });
        return;
      }
      logFirestoreError("Failed to import Pinkka entities", error);
      toast({
        title: "Import failed",
        description: "Unable to import the selected entities.",
        variant: "destructive",
      });
    } finally {
      interruptRequestedRef.current = false;
      setActiveImportAction(null);
    }
  };

  const handleReimport = async () => {
    if (!user || !importTarget) return;
    const reimportIds = hasMixedSelection
      ? selectedTargetIds
      : reimportableSelectedIds;
    if (reimportIds.length === 0) return;

    setActiveImportAction("reimport");
    interruptRequestedRef.current = false;
    setImportProgress(createEmptyPinkkaImportProgress());
    try {
      let results = [];
      if (importTarget === "species") {
        results = await importPinkkaSpeciesList(
          reimportIds,
          user.uid,
          undefined,
          {
            groupId: selectedGroupId ?? undefined,
            stackId: selectedStackId ?? undefined,
            onProgress: setImportProgress,
            shouldInterrupt: () => interruptRequestedRef.current,
            force: true,
          },
        );
      } else if (importTarget === "stack") {
        results = await importPinkkaStacks(
          reimportIds,
          user.uid,
          undefined,
          {
            groupId: selectedGroupId ?? undefined,
            onProgress: setImportProgress,
            shouldInterrupt: () => interruptRequestedRef.current,
            force: true,
          },
        );
      } else {
        results = await importPinkkaGroups(
          reimportIds,
          user.uid,
          undefined,
          {
            onProgress: setImportProgress,
            shouldInterrupt: () => interruptRequestedRef.current,
            force: true,
          },
        );
      }
      toast({
        title: hasMixedSelection
          ? "Import/Reimport complete"
          : "Re-import complete",
        description: `${hasMixedSelection ? "Imported/Re-imported" : "Re-imported"} ${
          results.length
        } ${results.length === 1 ? importLabels.singular : importLabels.plural}.`,
      });
      setImportStatusVersion((prev) => prev + 1);
    } catch (error) {
      if (isPinkkaImportInterruptedError(error)) {
        toast({
          title: hasMixedSelection
            ? "Import/Reimport interrupted"
            : "Re-import interrupted",
          description: "The Pinkka import was interrupted.",
        });
        return;
      }
      logFirestoreError("Failed to re-import Pinkka entities", error);
      toast({
        title: hasMixedSelection
          ? "Import/Reimport failed"
          : "Re-import failed",
        description: "Unable to import/re-import the selected entities.",
        variant: "destructive",
      });
    } finally {
      interruptRequestedRef.current = false;
      setActiveImportAction(null);
    }
  };

  const handleImportMissing = async () => {
    if (!user || !importTarget) return;
    if (importMissingSelectedIds.length === 0) return;

    setActiveImportAction("importmissing");
    interruptRequestedRef.current = false;
    setImportProgress(createEmptyPinkkaImportProgress());
    try {
      let results = [];
      if (importTarget === "species") {
        results = await importPinkkaSpeciesList(
          importMissingSelectedIds,
          user.uid,
          undefined,
          {
            groupId: selectedGroupId ?? undefined,
            stackId: selectedStackId ?? undefined,
            onProgress: setImportProgress,
            shouldInterrupt: () => interruptRequestedRef.current,
            force: true,
          },
        );
      } else if (importTarget === "stack") {
        results = await importPinkkaStacks(
          importMissingSelectedIds,
          user.uid,
          undefined,
          {
            groupId: selectedGroupId ?? undefined,
            onProgress: setImportProgress,
            shouldInterrupt: () => interruptRequestedRef.current,
            force: true,
          },
        );
      } else {
        results = await importPinkkaGroups(
          importMissingSelectedIds,
          user.uid,
          undefined,
          {
            onProgress: setImportProgress,
            shouldInterrupt: () => interruptRequestedRef.current,
            force: true,
          },
        );
      }
      toast({
        title: "Import missing complete",
        description: `Imported missing ${results.length} ${
          results.length === 1 ? importLabels.singular : importLabels.plural
        }.`,
      });
      setImportStatusVersion((prev) => prev + 1);
    } catch (error) {
      if (isPinkkaImportInterruptedError(error)) {
        toast({
          title: "Import missing interrupted",
          description: "The Pinkka import was interrupted.",
        });
        return;
      }
      logFirestoreError("Failed to import missing Pinkka entities", error);
      toast({
        title: "Import missing failed",
        description: "Unable to import missing entities for the selection.",
        variant: "destructive",
      });
    } finally {
      interruptRequestedRef.current = false;
      setActiveImportAction(null);
    }
  };

  const handleInterruptImport = useCallback(() => {
    interruptRequestedRef.current = true;
  }, []);

  const handleSelectedIdsChange = useCallback(
    (ids: {
      groupId: number | null;
      stackId: number | null;
      speciesId: number | null;
    }) => {
      const normalizedGroupId = ids.groupId;
      const normalizedStackId = ids.groupId ? ids.stackId : null;
      const normalizedSpeciesId =
        ids.groupId && ids.stackId ? ids.speciesId : null;

      if (
        normalizedGroupId === selectedGroupId &&
        normalizedStackId === selectedStackId &&
        normalizedSpeciesId === selectedSpeciesId
      ) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams.toString());
      if (normalizedGroupId !== null) {
        nextParams.set("group", String(normalizedGroupId));
      } else {
        nextParams.delete("group");
      }

      if (normalizedStackId !== null) {
        nextParams.set("stack", String(normalizedStackId));
      } else {
        nextParams.delete("stack");
      }

      if (normalizedSpeciesId !== null) {
        nextParams.set("species", String(normalizedSpeciesId));
      } else {
        nextParams.delete("species");
      }

      const query = nextParams.toString();
      const nextUrl = query ? `${pathname}?${query}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [
      pathname,
      router,
      searchParams,
      selectedGroupId,
      selectedSpeciesId,
      selectedStackId,
    ],
  );

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-background">
        <main className="container mx-auto flex flex-1 flex-col px-4 py-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Pinkka Content</h1>
              <p className="text-sm text-muted-foreground">
                Browse Pinkka groups, stacks, and species details.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {showImportButton && (
                <Button
                  onClick={handleImport}
                  disabled={
                    !user ||
                    !importTarget ||
                    isImporting ||
                    isCheckingImportStatus ||
                    importCount === 0
                  }
                >
                  {activeImportAction === "import"
                    ? "Importing..."
                    : `Import Selected ${importLabels.title} (${importCount})`}
                </Button>
              )}
              {hasIncompleteSelection && (
                <Button
                  variant="secondary"
                  onClick={handleImportMissing}
                  disabled={
                    !user ||
                    !importTarget ||
                    isImporting ||
                    isCheckingImportStatus ||
                    importMissingCount === 0
                  }
                >
                  {activeImportAction === "importmissing"
                    ? "Importing Missing..."
                    : `Import Missing Selected ${importLabels.title} (${importMissingCount})`}
                </Button>
              )}
              {showReimportButton && (
                <Button
                  variant="secondary"
                  onClick={handleReimport}
                  disabled={
                    !user ||
                    !importTarget ||
                    isImporting ||
                    isCheckingImportStatus ||
                    reimportCount === 0
                  }
                >
                  {activeImportAction === "reimport"
                    ? hasMixedSelection
                      ? "Importing/Reimporting..."
                      : "Re-importing..."
                    : `${
                        hasMixedSelection ? "Import/Reimport" : "Re-import"
                      } Selected ${importLabels.title} (${reimportCount})`}
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="h-[70vh]">
              <PinkkaExplorer
                importStatusVersion={importStatusVersion}
                preferredLang={preferredLanguage}
                selectedGroupId={selectedGroupId}
                selectedStackId={selectedStackId}
                selectedSpeciesId={selectedSpeciesId}
                onSelectedIdsChange={handleSelectedIdsChange}
              />
            </div>
          </div>
        </main>
        <PinkkaImportProgressDialog
          open={isImporting}
          progress={importProgress}
          onInterrupt={handleInterruptImport}
        />
      </div>
    </ProtectedRoute>
  );
}
