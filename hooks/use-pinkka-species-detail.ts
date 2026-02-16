"use client";

import { useCallback, useRef } from "react";
import type { FinderItem } from "@/components/finder-columns";
import type {
  PinkkaSpeciesCard,
  PinkkaSpeciesDetail,
} from "@/lib/pinkka/pinkka-api";

/** Loader for fetching the detail payload for a species card. */
export type LoadSpeciesDetail = (
  item: FinderItem<PinkkaSpeciesCard>,
) => Promise<FinderItem<PinkkaSpeciesDetail> | null>;

/** Hook for fetching and caching Pinkka species details. */
export function usePinkkaSpeciesDetail(
  fetchSpecies: (speciesId: number) => Promise<PinkkaSpeciesDetail | null>,
) {
  const speciesDetailsRef = useRef<Record<number, PinkkaSpeciesDetail | null>>(
    {},
  );

  const loadSpeciesDetail = useCallback<LoadSpeciesDetail>(
    async (item) => {
      const speciesId = item.payload.id;
      const cached = speciesDetailsRef.current[speciesId];
      if (cached) {
        return {
          id: speciesId,
          type: "species-detail",
          payload: cached,
        };
      }

      const detail = await fetchSpecies(speciesId);
      if (!detail) {
        throw new Error("Failed to load species details.");
      }
      speciesDetailsRef.current[speciesId] = detail;
      return {
        id: speciesId,
        type: "species-detail",
        payload: detail,
      };
    },
    [fetchSpecies],
  );

  return { loadSpeciesDetail };
}
