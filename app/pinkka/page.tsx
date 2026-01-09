"use client";

import { useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { PinkkaExplorer } from "@/components/pinkka/pinkka-explorer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { importPinkkaGroups } from "@/lib/firebase/firestore-helpers";
import type { FinderSelectionState } from "@/components/finder-columns";
import type { PinkkaGroup } from "@/lib/pinkka/pinkka-api";
import { logFirestoreError } from "@/lib/utils";

/** Admin-facing page for browsing Pinkka content. */
export default function PinkkaContentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectionState, setSelectionState] =
    useState<FinderSelectionState | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatusVersion, setImportStatusVersion] = useState(0);

  const selectedGroupIds = useMemo(() => {
    if (!selectionState) return [];
    const groupIds = new Set<number>();
    selectionState.selectedItemsByColumn.flat().forEach((item) => {
      if (item.type !== "group") return;
      const group = item.payload as PinkkaGroup;
      groupIds.add(group.id);
    });
    return Array.from(groupIds);
  }, [selectionState]);

  const handleImport = async () => {
    if (!user) return;
    setIsImporting(true);
    try {
      const results = await importPinkkaGroups(selectedGroupIds, user.uid);
      toast({
        title: "Import complete",
        description: `Imported ${results.length} group(s).`,
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
        <Navbar />
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
              disabled={!user || selectedGroupIds.length === 0 || isImporting}
            >
              {isImporting
                ? "Importing..."
                : `Import Selected (${selectedGroupIds.length})`}
            </Button>
          </div>
          <div className="flex-1">
            <div className="h-[70vh]">
              <PinkkaExplorer
                onSelectionChange={setSelectionState}
                importStatusVersion={importStatusVersion}
              />
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
