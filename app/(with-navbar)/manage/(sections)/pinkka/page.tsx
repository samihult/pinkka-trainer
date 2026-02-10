"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { PinkkaExplorer } from "@/components/pinkka/pinkka-explorer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";
import {
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

/** Admin-facing page for browsing Pinkka content. */
export default function PinkkaContentPage() {
  const { language } = useLanguagePreference();
  const preferredLanguage = toLanguageCode(language);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isImporting, setIsImporting] = useState(false);
  const [importStatusVersion, setImportStatusVersion] = useState(0);

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
    const normalizedGroup = selectedGroupId !== null ? String(selectedGroupId) : null;
    const normalizedStack = selectedStackId !== null ? String(selectedStackId) : null;
    const normalizedSpecies = selectedSpeciesId !== null ? String(selectedSpeciesId) : null;

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
    () => (selectedGroupId ? [selectedGroupId] : []),
    [selectedGroupId],
  );
  const selectedStackIds = useMemo(
    () => (selectedStackId ? [selectedStackId] : []),
    [selectedStackId],
  );
  const selectedSpeciesIds = useMemo(
    () => (selectedSpeciesId ? [selectedSpeciesId] : []),
    [selectedSpeciesId],
  );

  const importTarget = useMemo(() => {
    if (selectedSpeciesId !== null) return "species";
    if (selectedStackId !== null) return "stack";
    if (selectedGroupId !== null) return "group";
    return null;
  }, [selectedGroupId, selectedSpeciesId, selectedStackId]);

  const importCount = useMemo(() => {
    if (importTarget === "species") return selectedSpeciesId ? 1 : 0;
    if (importTarget === "stack") return selectedStackId ? 1 : 0;
    if (importTarget === "group") return selectedGroupId ? 1 : 0;
    return 0;
  }, [
    importTarget,
    selectedGroupId,
    selectedSpeciesId,
    selectedStackId,
  ]);

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

  const handleImport = async () => {
    if (!user || !importTarget) return;
    setIsImporting(true);
    try {
      let results = [];
      if (importTarget === "species") {
        results = await importPinkkaSpeciesList(
          selectedSpeciesIds,
          user.uid,
          undefined,
          {
            groupId: selectedGroupId ?? undefined,
            stackId: selectedStackId ?? undefined,
          },
        );
      } else if (importTarget === "stack") {
        results = await importPinkkaStacks(
          selectedStackIds,
          user.uid,
          undefined,
          { groupId: selectedGroupId ?? undefined },
        );
      } else {
        results = await importPinkkaGroups(selectedGroupIds, user.uid);
      }
      toast({
        title: "Import complete",
        description: `Imported ${results.length} ${
          results.length === 1 ? importLabels.singular : importLabels.plural
        }.`,
      });
      setImportStatusVersion((prev) => prev + 1);
    } catch (error) {
      logFirestoreError("Failed to import Pinkka groups", error);
      toast({
        title: "Import failed",
        description: "Unable to import the selected groups.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSelectedIdsChange = useCallback(
    (ids: { groupId: number | null; stackId: number | null; speciesId: number | null }) => {
      const normalizedGroupId = ids.groupId;
      const normalizedStackId = ids.groupId ? ids.stackId : null;
      const normalizedSpeciesId = ids.groupId && ids.stackId ? ids.speciesId : null;

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
            <Button
              onClick={handleImport}
              disabled={!user || !importTarget || isImporting}
            >
              {isImporting
                ? "Importing..."
                : `Import Selected ${importLabels.title} (${importCount})`}
            </Button>
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
    </ProtectedRoute>
  );
}
