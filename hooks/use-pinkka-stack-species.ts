"use client";

import { useCallback, useRef } from "react";
import type { FinderItem } from "@/components/finder-columns";
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
) {
  const speciesBySubStackRef = useRef<Record<number, PinkkaSpeciesCard[]>>({});

  const loadStackSpecies = useCallback<LoadStackSpecies>(
    async (item) => {
      const stackId = item.payload.id;
      const cached = speciesBySubStackRef.current[stackId];
      if (cached) {
        return cached.map((species) => ({
          id: species.id,
          type: "species",
          payload: species,
        }));
      }
      const subStack = await fetchSubStack(stackId);
      if (!subStack) {
        throw new Error("Failed to load species for the selected stack.");
      }
      const speciesCards = subStack.speciesCards ?? [];
      speciesBySubStackRef.current[stackId] = speciesCards;
      return speciesCards.map((species) => ({
        id: species.id,
        type: "species",
        payload: species,
      }));
    },
    [fetchSubStack],
  );

  return { loadStackSpecies };
}
