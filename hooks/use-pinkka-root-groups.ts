"use client";

import { useCallback, useRef } from "react";
import type { FinderItem } from "@/components/finder-columns";
import type { PinkkaGroup } from "@/lib/pinkka/pinkka-api";

/** Loader for fetching Pinkka root groups and caching the result. */
export type LoadRootGroups = (
  item: FinderItem<null>,
) => Promise<FinderItem<PinkkaGroup>[] | FinderItem | null>;

/** Hook for fetching and caching Pinkka root groups. */
export function usePinkkaRootGroups(fetchGroups: () => Promise<PinkkaGroup[]>) {
  const groupsRef = useRef<PinkkaGroup[] | null>(null);

  const loadRootGroups = useCallback<LoadRootGroups>(
    async (_item) => {
      if (groupsRef.current) {
        return groupsRef.current.map((group) => ({
          id: group.id,
          type: "group",
          payload: group,
        }));
      }

      const data = await fetchGroups();
      groupsRef.current = data;
      return data.map((group) => ({
        id: group.id,
        type: "group",
        payload: group,
      }));
    },
    [fetchGroups],
  );

  return { loadRootGroups };
}
