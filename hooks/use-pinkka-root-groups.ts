"use client";

/** Cached Pinkka root-group loader with batched import-status refreshes. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { FinderItem } from "@/components/finder-columns";
import {
  getPinkkaGroupImportStateMap,
  type PinkkaImportStatus,
} from "@/lib/firebase/firestore-helpers";
import type { PinkkaGroup } from "@/lib/pinkka/pinkka-api";

/** Loader for fetching Pinkka root groups and caching the result. */
export type LoadRootGroups = (
  item: FinderItem<null>,
) => Promise<FinderItem<PinkkaGroup>[] | FinderItem | null>;

/** Hook for fetching and caching Pinkka root groups. */
export function usePinkkaRootGroups(
  fetchGroups: () => Promise<PinkkaGroup[]>,
  options?: { importStatusVersion?: number },
) {
  const groupsRef = useRef<PinkkaGroup[] | null>(null);
  const groupsPromiseRef = useRef<Promise<PinkkaGroup[]> | null>(null);
  const [groupImportStatuses, setGroupImportStatuses] = useState<
    Record<number, PinkkaImportStatus>
  >({});

  const loadGroupImportStatuses = useCallback(async (groups: PinkkaGroup[]) => {
    const groupIds = groups
      .map((group) => group.id)
      .filter((groupId): groupId is number => Number.isFinite(groupId));
    if (groupIds.length === 0) {
      setGroupImportStatuses({});
      return;
    }

    setGroupImportStatuses(await getPinkkaGroupImportStateMap(groupIds));
  }, []);

  const loadRootGroups = useCallback<LoadRootGroups>(
    async (_item) => {
      if (groupsRef.current) {
        void loadGroupImportStatuses(groupsRef.current);
        return groupsRef.current.map((group) => ({
          id: group.id,
          type: "group",
          payload: group,
        }));
      }

      const groupsPromise =
        groupsPromiseRef.current ??
        fetchGroups().finally(() => {
          groupsPromiseRef.current = null;
        });
      groupsPromiseRef.current = groupsPromise;
      const data = await groupsPromise;
      groupsRef.current = data;
      void loadGroupImportStatuses(data);
      return data.map((group) => ({
        id: group.id,
        type: "group",
        payload: group,
      }));
    },
    [fetchGroups, loadGroupImportStatuses],
  );

  useEffect(() => {
    if (!groupsRef.current) {
      return;
    }

    void loadGroupImportStatuses(groupsRef.current);
  }, [loadGroupImportStatuses, options?.importStatusVersion]);

  return { loadRootGroups, groupImportStatuses };
}
