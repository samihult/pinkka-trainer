"use client";

/** Cached Pinkka species-card loader with batched import-status refreshes per stack. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { FinderItem } from "@/components/finder-columns";
import {
  getPinkkaSpeciesImportStateMap,
  type PinkkaImportStatus,
} from "@/lib/firebase/firestore-helpers";
import type {
  PinkkaSpeciesCard,
  PinkkaSubStack,
} from "@/lib/pinkka/pinkka-api";

/** Loader for fetching species cards within a stack. */
export type LoadStackSpecies = (
  item: FinderItem<PinkkaSubStack>,
) => Promise<FinderItem<PinkkaSpeciesCard>[] | FinderItem | null>;

/** Hook for fetching and caching Pinkka species cards for stacks. */
export function usePinkkaStackSpecies(
  fetchSubStack: (subStackId: number) => Promise<PinkkaSubStack | null>,
  options?: {
    groupId?: number | null;
    importStatusVersion?: number;
  },
) {
  const selectedGroupId = options?.groupId ?? null;
  const importStatusVersion = options?.importStatusVersion;
  const speciesBySubStackRef = useRef<Record<number, PinkkaSpeciesCard[]>>({});
  const speciesPromiseBySubStackRef = useRef<
    Record<number, Promise<PinkkaSpeciesCard[]>>
  >({});
  const [speciesImportStatusesByStack, setSpeciesImportStatusesByStack] =
    useState<Record<number, Record<number, PinkkaImportStatus>>>({});

  const loadSpeciesImportStatuses = useCallback(
    async (stackId: number, speciesCards: PinkkaSpeciesCard[]) => {
      if (typeof selectedGroupId !== "number") {
        return;
      }

      const speciesIds = speciesCards
        .map((species) => species.id)
        .filter((speciesId): speciesId is number => Number.isFinite(speciesId));
      if (speciesIds.length === 0) {
        setSpeciesImportStatusesByStack((prev) => ({ ...prev, [stackId]: {} }));
        return;
      }

      const statusMap = await getPinkkaSpeciesImportStateMap(
        selectedGroupId,
        stackId,
        speciesIds,
      );
      setSpeciesImportStatusesByStack((prev) => ({
        ...prev,
        [stackId]: statusMap,
      }));
    },
    [selectedGroupId],
  );

  const loadStackSpecies = useCallback<LoadStackSpecies>(
    async (item) => {
      const stackId = item.payload.id;
      const cached = speciesBySubStackRef.current[stackId];
      if (cached) {
        void loadSpeciesImportStatuses(stackId, cached);
        return cached.map((species) => ({
          id: species.id,
          type: "species",
          payload: species,
        }));
      }
      const speciesPromise =
        speciesPromiseBySubStackRef.current[stackId] ??
        fetchSubStack(stackId)
          .then((subStack) => {
            if (!subStack) {
              throw new Error("Failed to load species for the selected stack.");
            }
            return subStack.speciesCards ?? [];
          })
          .finally(() => {
            delete speciesPromiseBySubStackRef.current[stackId];
          });
      speciesPromiseBySubStackRef.current[stackId] = speciesPromise;
      const speciesCards = await speciesPromise;
      speciesBySubStackRef.current[stackId] = speciesCards;
      void loadSpeciesImportStatuses(stackId, speciesCards);
      return speciesCards.map((species) => ({
        id: species.id,
        type: "species",
        payload: species,
      }));
    },
    [fetchSubStack, loadSpeciesImportStatuses],
  );

  useEffect(() => {
    if (typeof selectedGroupId !== "number") {
      return;
    }

    const cachedEntries = Object.entries(speciesBySubStackRef.current);
    if (cachedEntries.length === 0) {
      return;
    }

    void Promise.all(
      cachedEntries.map(([stackId, speciesCards]) =>
        loadSpeciesImportStatuses(Number(stackId), speciesCards),
      ),
    );
  }, [importStatusVersion, loadSpeciesImportStatuses, selectedGroupId]);

  return { loadStackSpecies, speciesImportStatusesByStack };
}
