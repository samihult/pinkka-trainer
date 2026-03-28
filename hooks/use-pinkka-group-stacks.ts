"use client";

/** Cached Pinkka stack loader with batched import-status refreshes per group. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { FinderItem } from "@/components/finder-columns";
import {
  getPinkkaStackImportStateMap,
  type PinkkaImportStatus,
} from "@/lib/firebase/firestore-helpers";
import type { PinkkaGroup, PinkkaSubStack } from "@/lib/pinkka/pinkka-api";

/** Loader for fetching Pinkka stacks for a group. */
export type LoadGroupStacks = (
  item: FinderItem<PinkkaGroup>,
) => Promise<FinderItem<PinkkaSubStack>[] | FinderItem | null>;

/** Hook for fetching and caching Pinkka stacks for groups. */
export function usePinkkaGroupStacks(
  fetchGroupWithStacks: (groupId: number) => Promise<PinkkaGroup | null>,
  options?: { importStatusVersion?: number },
) {
  const subStacksByGroupRef = useRef<Record<number, PinkkaSubStack[]>>({});
  const subStacksPromiseByGroupRef = useRef<
    Record<number, Promise<PinkkaSubStack[]>>
  >({});
  const [stackImportStatusesByGroup, setStackImportStatusesByGroup] = useState<
    Record<number, Record<number, PinkkaImportStatus>>
  >({});

  const loadStackImportStatuses = useCallback(
    async (groupId: number, stacks: PinkkaSubStack[]) => {
      const stackIds = stacks
        .map((stack) => stack.id)
        .filter((stackId): stackId is number => Number.isFinite(stackId));
      if (stackIds.length === 0) {
        setStackImportStatusesByGroup((prev) => ({ ...prev, [groupId]: {} }));
        return;
      }

      const statusMap = await getPinkkaStackImportStateMap(groupId, stackIds);
      setStackImportStatusesByGroup((prev) => ({
        ...prev,
        [groupId]: statusMap,
      }));
    },
    [],
  );

  const loadGroupStacks = useCallback<LoadGroupStacks>(
    async (item) => {
      const groupId = item.payload.id;
      const cached = subStacksByGroupRef.current[groupId];
      if (cached) {
        void loadStackImportStatuses(groupId, cached);
        return cached.map((stack) => ({
          id: stack.id,
          type: "stack",
          payload: stack,
        }));
      }

      const subStacksPromise =
        subStacksPromiseByGroupRef.current[groupId] ??
        fetchGroupWithStacks(groupId)
          .then((groupDetail) => {
            if (!groupDetail) {
              throw new Error("Failed to load stacks for the selected group.");
            }
            return (
              groupDetail.subPinkkas
                ?.slice()
                .sort((a, b) => a.orderNo - b.orderNo) ?? []
            );
          })
          .finally(() => {
            delete subStacksPromiseByGroupRef.current[groupId];
          });
      subStacksPromiseByGroupRef.current[groupId] = subStacksPromise;
      const subStacks = await subStacksPromise;
      subStacksByGroupRef.current[groupId] = subStacks;
      void loadStackImportStatuses(groupId, subStacks);
      return subStacks.map((stack) => ({
        id: stack.id,
        type: "stack",
        payload: stack,
      }));
    },
    [fetchGroupWithStacks, loadStackImportStatuses],
  );

  useEffect(() => {
    const cachedEntries = Object.entries(subStacksByGroupRef.current);
    if (cachedEntries.length === 0) {
      return;
    }

    void Promise.all(
      cachedEntries.map(([groupId, stacks]) =>
        loadStackImportStatuses(Number(groupId), stacks),
      ),
    );
  }, [loadStackImportStatuses, options?.importStatusVersion]);

  return { loadGroupStacks, stackImportStatusesByGroup };
}
