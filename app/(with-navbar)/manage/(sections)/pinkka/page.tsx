"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useManagePinkkaImportToast } from "@/components/manage-pinkka-import-toast-provider";
import { ProtectedRoute } from "@/components/protected-route";
import { PinkkaExplorer } from "@/components/pinkka/pinkka-explorer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  enqueuePinkkaImportJob,
  getPinkkaGroupImportStateMap,
  getPinkkaSpeciesImportStateMap,
  getPinkkaStackImportStateMap,
  type PinkkaImportJobAction,
} from "@/lib/firebase/firestore-helpers";
import { useI18n } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";
import { logFirestoreError } from "@/lib/utils";

function parseNumericParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasSameEntityIds(left: number[], right: number[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const leftSorted = [...left].sort((a, b) => a - b);
  const rightSorted = [...right].sort((a, b) => a - b);
  return leftSorted.every((value, index) => value === rightSorted[index]);
}

/** Admin-facing page for browsing Pinkka content. */
function PinkkaContentPageContent() {
  const { t } = useI18n();
  const { language } = useLanguagePreference();
  const preferredLanguage = toLanguageCode(language);
  const { user } = useAuth();
  const { activeJobs, jobs } = useManagePinkkaImportToast();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const [importStatusVersion, setImportStatusVersion] = useState(0);
  const handledTerminalJobIdsRef = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    const nextTerminalJobIds = jobs
      .filter(
        (job) =>
          job.status === "completed" ||
          job.status === "failed" ||
          job.status === "interrupted",
      )
      .map((job) => job.id);

    const hasNewTerminalJob = nextTerminalJobIds.some(
      (jobId) => !handledTerminalJobIdsRef.current.has(jobId),
    );
    if (!hasNewTerminalJob) {
      return;
    }

    handledTerminalJobIdsRef.current = new Set(nextTerminalJobIds);
    setImportStatusVersion((prev) => prev + 1);
  }, [jobs]);

  const hasImportedSelection = importedSelectedIds.length > 0;
  const hasReimportableSelection = reimportableSelectedIds.length > 0;
  const hasIncompleteSelection = incompleteSelectedIds.length > 0;
  const hasUnimportedSelection = unimportedSelectedIds.length > 0;
  const hasMixedSelection = hasImportedSelection && hasUnimportedSelection;
  const hasSelection = selectedTargetIds.length > 0;
  const matchingActiveJob = useMemo(() => {
    if (!importTarget || selectedTargetIds.length === 0) {
      return null;
    }
    return (
      activeJobs.find(
        (job) =>
          job.target === importTarget &&
          job.groupId === (selectedGroupId ?? undefined) &&
          job.stackId === (selectedStackId ?? undefined) &&
          hasSameEntityIds(job.entityIds, selectedTargetIds),
      ) ?? null
    );
  }, [
    activeJobs,
    importTarget,
    selectedGroupId,
    selectedStackId,
    selectedTargetIds,
  ]);
  const isImporting = matchingActiveJob !== null;
  const activeImportAction = matchingActiveJob?.action ?? null;
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
  const showReimportButton =
    hasReimportableSelection && !hasIncompleteSelection;

  const selectionTargetLabel = useMemo(() => {
    if (importTarget === "species") {
      return t("manage.pinkkaImport.target.speciesPlural");
    }
    if (importTarget === "stack") {
      return t("manage.pinkkaImport.target.stackPlural");
    }
    if (importTarget === "group") {
      return t("manage.pinkkaImport.target.groupPlural");
    }
    return t("manage.pinkkaImport.target.itemPlural");
  }, [importTarget, t]);

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

  const enqueueImportJob = useCallback(
    async (action: PinkkaImportJobAction, entityIds: number[]) => {
      if (!user || !importTarget) {
        return;
      }

      try {
        await enqueuePinkkaImportJob({
          requesterId: user.uid,
          action,
          target: importTarget,
          entityIds,
          ...(selectedGroupId !== null ? { groupId: selectedGroupId } : {}),
          ...(selectedStackId !== null ? { stackId: selectedStackId } : {}),
        });
      } catch (error) {
        logFirestoreError("Failed to enqueue Pinkka import job", error);
        toast({
          title: t("manage.pinkka.toast.jobFailedTitle"),
          description: t("manage.pinkka.toast.jobFailedDescription"),
          variant: "destructive",
        });
      }
    },
    [importTarget, selectedGroupId, selectedStackId, t, toast, user],
  );

  const handleImport = useCallback(async () => {
    if (unimportedSelectedIds.length === 0) {
      toast({
        title: t("manage.pinkka.toast.nothingToImportTitle"),
        description: t("manage.pinkka.toast.nothingToImportDescription"),
      });
      return;
    }

    await enqueueImportJob("import", unimportedSelectedIds);
  }, [enqueueImportJob, t, toast, unimportedSelectedIds]);

  const handleReimport = useCallback(async () => {
    const reimportIds = hasMixedSelection
      ? selectedTargetIds
      : reimportableSelectedIds;
    if (reimportIds.length === 0) {
      return;
    }
    await enqueueImportJob("reimport", reimportIds);
  }, [
    enqueueImportJob,
    hasMixedSelection,
    reimportableSelectedIds,
    selectedTargetIds,
  ]);

  const handleImportMissing = useCallback(async () => {
    if (importMissingSelectedIds.length === 0) {
      return;
    }
    await enqueueImportJob("importmissing", importMissingSelectedIds);
  }, [enqueueImportJob, importMissingSelectedIds]);

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
    <div className="min-h-screen bg-background">
      <main className="container mx-auto flex flex-1 flex-col px-4 py-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              {t("manage.pinkka.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("manage.pinkka.description")}
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
                  ? t("manage.pinkka.button.importing")
                  : t("manage.pinkka.button.importSelected", {
                      target: selectionTargetLabel,
                      count: importCount,
                    })}
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
                  ? t("manage.pinkka.button.importingMissing")
                  : t("manage.pinkka.button.importMissingSelected", {
                      target: selectionTargetLabel,
                      count: importMissingCount,
                    })}
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
                    ? t("manage.pinkka.button.importingReimporting")
                    : t("manage.pinkka.button.reimporting")
                  : `${
                      hasMixedSelection
                        ? t("manage.pinkka.button.importReimportSelected", {
                            target: selectionTargetLabel,
                            count: reimportCount,
                          })
                        : t("manage.pinkka.button.reimportSelected", {
                            target: selectionTargetLabel,
                            count: reimportCount,
                          })
                    }`}
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
    </div>
  );
}

function PinkkaContentPageFallback() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto flex flex-1 flex-col px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">{t("manage.pinkka.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("manage.pinkka.loading")}
          </p>
        </div>
        <div className="h-[70vh] rounded-md border border-border bg-muted/20" />
      </main>
    </div>
  );
}

/** Admin-facing page for browsing Pinkka content. */
export default function PinkkaContentPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <Suspense fallback={<PinkkaContentPageFallback />}>
        <PinkkaContentPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
