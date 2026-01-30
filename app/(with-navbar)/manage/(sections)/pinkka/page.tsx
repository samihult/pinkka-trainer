"use client";

import { useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
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
import type { FinderSelectionState } from "@/components/finder-columns";
import type {
  PinkkaGroup,
  PinkkaSpeciesCard,
  PinkkaSubStack,
} from "@/lib/pinkka/pinkka-api";
import { logFirestoreError } from "@/lib/utils";

/** Admin-facing page for browsing Pinkka content. */
export default function PinkkaContentPage() {
  const { language } = useLanguagePreference();
  const preferredLanguage = toLanguageCode(language);
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectionState, setSelectionState] =
    useState<FinderSelectionState | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatusVersion, setImportStatusVersion] = useState(0);

  const selectedItems = useMemo(
    () => selectionState?.selectedItemsByColumn.flat() ?? [],
    [selectionState],
  );

  const { selectedGroupIds, selectedStackIds, selectedSpeciesIds } =
    useMemo(() => {
      const groupIds = new Set<number>();
      const stackIds = new Set<number>();
      const speciesIds = new Set<number>();

      selectedItems.forEach((item) => {
        if (item.type === "group") {
          const group = item.payload as PinkkaGroup;
          groupIds.add(group.id);
          return;
        }
        if (item.type === "stack") {
          const stack = item.payload as PinkkaSubStack;
          stackIds.add(stack.id);
          return;
        }
        if (item.type === "species") {
          const species = item.payload as PinkkaSpeciesCard;
          speciesIds.add(species.id);
        }
      });

      return {
        selectedGroupIds: Array.from(groupIds),
        selectedStackIds: Array.from(stackIds),
        selectedSpeciesIds: Array.from(speciesIds),
      };
    }, [selectedItems]);

  const importTarget = useMemo(() => {
    if (selectedSpeciesIds.length > 0) return "species";
    if (selectedStackIds.length > 0) return "stack";
    if (selectedGroupIds.length > 0) return "group";
    return null;
  }, [
    selectedGroupIds.length,
    selectedSpeciesIds.length,
    selectedStackIds.length,
  ]);

  const importCount = useMemo(() => {
    if (importTarget === "species") return selectedSpeciesIds.length;
    if (importTarget === "stack") return selectedStackIds.length;
    if (importTarget === "group") return selectedGroupIds.length;
    return 0;
  }, [
    importTarget,
    selectedGroupIds.length,
    selectedSpeciesIds.length,
    selectedStackIds.length,
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
        results = await importPinkkaSpeciesList(selectedSpeciesIds, user.uid);
      } else if (importTarget === "stack") {
        results = await importPinkkaStacks(selectedStackIds, user.uid);
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
                onSelectionChange={setSelectionState}
                importStatusVersion={importStatusVersion}
                preferredLang={preferredLanguage}
              />
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
