"use client";

import { useCallback, useRef } from "react";
import type { FinderItem } from "@/components/finder-columns";
import type { PinkkaGroup, PinkkaSubStack } from "@/lib/pinkka/pinkka-api";

/** Loader for fetching Pinkka stacks for a group. */
export type LoadGroupStacks = (
  item: FinderItem<PinkkaGroup>,
) => Promise<FinderItem<PinkkaSubStack>[] | FinderItem | null>;

/** Hook for fetching and caching Pinkka stacks for groups. */
export function usePinkkaGroupStacks(
  fetchGroupWithStacks: (groupId: number) => Promise<PinkkaGroup | null>,
) {
  const subStacksByGroupRef = useRef<Record<number, PinkkaSubStack[]>>({});

  const loadGroupStacks = useCallback<LoadGroupStacks>(
    async (item) => {
      const groupId = item.payload.id;
      const cached = subStacksByGroupRef.current[groupId];
      if (cached) {
        return cached.map((stack) => ({
          id: stack.id,
          type: "stack",
          payload: stack,
        }));
      }

      const groupDetail = await fetchGroupWithStacks(groupId);
      if (!groupDetail) {
        throw new Error("Failed to load stacks for the selected group.");
      }
      const subStacks =
        groupDetail.subPinkkas?.slice().sort((a, b) => a.orderNo - b.orderNo) ??
        [];
      subStacksByGroupRef.current[groupId] = subStacks;
      return subStacks.map((stack) => ({
        id: stack.id,
        type: "stack",
        payload: stack,
      }));
    },
    [fetchGroupWithStacks],
  );

  return { loadGroupStacks };
}
