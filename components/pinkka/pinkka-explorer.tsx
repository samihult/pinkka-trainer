"use client";

import { useCallback, useMemo, useState } from "react";
import {
  fetchPinkkaGroups,
  fetchPinkkaGroupWithStacks,
  fetchPinkkaSpecies,
  fetchPinkkaSubStack,
  type PinkkaGroup,
  type PinkkaSpeciesCard,
  type PinkkaSpeciesDetail,
  type PinkkaSubStack,
} from "@/lib/pinkka/pinkka-api";
import {
  FinderColumns,
  type FinderItem,
  type FinderSelectionState,
} from "@/components/finder-columns";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";
import { createRootTypeConfig } from "@/components/pinkka/type-configs/root-type-config";
import { createGroupTypeConfig } from "@/components/pinkka/type-configs/group-type-config";
import { createStackTypeConfig } from "@/components/pinkka/type-configs/stack-type-config";
import { createSpeciesTypeConfig } from "@/components/pinkka/type-configs/species-type-config";
import { createSpeciesDetailTypeConfig } from "@/components/pinkka/type-configs/species-detail-type-config";

/** API surface required by the explorer for loading Pinkka data. */
type PinkkaApi = {
  /** Fetch list of groups. */
  fetchGroups: typeof fetchPinkkaGroups;
  /** Fetch a group with its stacks. */
  fetchGroupWithStacks: typeof fetchPinkkaGroupWithStacks;
  /** Fetch a stack with species. */
  fetchSubStack: typeof fetchPinkkaSubStack;
  /** Fetch species detail by id. */
  fetchSpecies: typeof fetchPinkkaSpecies;
};

/** Props for rendering the Pinkka explorer columns. */
interface PinkkaExplorerProps {
  /** Preferred language for localized labels. */
  preferredLang?: PinkkaLanguage;
  /** Callback when a species is selected. */
  onSelectSpecies?: (species: PinkkaSpeciesCard) => void;
  /** Optional API overrides for Storybook/testing. */
  api?: Partial<PinkkaApi>;
}

const defaultApi: PinkkaApi = {
  fetchGroups: fetchPinkkaGroups,
  fetchGroupWithStacks: fetchPinkkaGroupWithStacks,
  fetchSubStack: fetchPinkkaSubStack,
  fetchSpecies: fetchPinkkaSpecies,
};

/** Finder-style explorer for Pinkka groups, stacks, and species details. */
export function PinkkaExplorer({
  preferredLang = "fi",
  onSelectSpecies,
  api,
}: PinkkaExplorerProps) {
  const pinkkaApi = useMemo(
    () => ({
      ...defaultApi,
      ...api,
    }),
    [api],
  );

  const [groups, setGroups] = useState<PinkkaGroup[] | null>(null);
  const [subStacksByGroup, setSubStacksByGroup] = useState<
    Record<number, PinkkaSubStack[]>
  >({});
  const [speciesBySubStack, setSpeciesBySubStack] = useState<
    Record<number, PinkkaSpeciesCard[]>
  >({});
  const [speciesDetails, setSpeciesDetails] = useState<
    Record<number, PinkkaSpeciesDetail | null>
  >({});
  const rootItem = useMemo<FinderItem<null>>(
    () => ({
      id: "root",
      type: "root",
      payload: null,
    }),
    [],
  );

  const loadRootGroups = useCallback(
    async (_item: FinderItem<null>) => {
      if (groups) {
        return groups.map((group) => ({
          id: group.id,
          type: "group",
          payload: group,
        }));
      }

      const data = await pinkkaApi.fetchGroups();
      setGroups(data);
      return data.map((group) => ({
        id: group.id,
        type: "group",
        payload: group,
      }));
    },
    [groups, pinkkaApi],
  );

  const loadGroupStacks = useCallback(
    async (item: FinderItem<PinkkaGroup>) => {
      const groupId = item.payload.id;
      const cached = subStacksByGroup[groupId];
      if (cached) {
        return cached.map((stack) => ({
          id: stack.id,
          type: "stack",
          payload: stack,
        }));
      }

      const groupDetail = await pinkkaApi.fetchGroupWithStacks(groupId);
      if (!groupDetail) {
        throw new Error("Failed to load stacks for the selected group.");
      }
      const subStacks =
        groupDetail.subPinkkas
          ?.slice()
          .sort((a, b) => a.orderNo - b.orderNo) ?? [];
      setSubStacksByGroup((prev) => ({
        ...prev,
        [groupId]: subStacks,
      }));
      return subStacks.map((stack) => ({
        id: stack.id,
        type: "stack",
        payload: stack,
      }));
    },
    [pinkkaApi, subStacksByGroup],
  );

  const loadStackSpecies = useCallback(
    async (item: FinderItem<PinkkaSubStack>) => {
      const stackId = item.payload.id;
      const cached = speciesBySubStack[stackId];
      if (cached) {
        return cached.map((species) => ({
          id: species.id,
          type: "species",
          payload: species,
        }));
      }
      const subStack = await pinkkaApi.fetchSubStack(stackId);
      if (!subStack) {
        throw new Error("Failed to load species for the selected stack.");
      }
      const speciesCards = subStack.speciesCards ?? [];
      setSpeciesBySubStack((prev) => ({
        ...prev,
        [stackId]: speciesCards,
      }));
      return speciesCards.map((species) => ({
        id: species.id,
        type: "species",
        payload: species,
      }));
    },
    [pinkkaApi, speciesBySubStack],
  );

  const loadSpeciesDetail = useCallback(
    async (item: FinderItem<PinkkaSpeciesCard>) => {
      const speciesId = item.payload.id;
      const cached = speciesDetails[speciesId];
      if (cached) {
        return {
          id: speciesId,
          type: "species-detail",
          payload: cached,
        };
      }

      const detail = await pinkkaApi.fetchSpecies(speciesId);
      if (!detail) {
        throw new Error("Failed to load species details.");
      }
      setSpeciesDetails((prev) => ({
        ...prev,
        [speciesId]: detail,
      }));
      return {
        id: speciesId,
        type: "species-detail",
        payload: detail,
      };
    },
    [pinkkaApi, speciesDetails],
  );

  const typeConfigs = useMemo(
    () => ({
      root: createRootTypeConfig({
        loadChildren: loadRootGroups,
      }),
      group: createGroupTypeConfig({
        preferredLang,
        loadChildren: loadGroupStacks,
      }),
      stack: createStackTypeConfig({
        preferredLang,
        loadChildren: loadStackSpecies,
      }),
      species: createSpeciesTypeConfig({
        preferredLang,
        loadChildren: loadSpeciesDetail,
      }),
      "species-detail": createSpeciesDetailTypeConfig({ preferredLang }),
    }),
    [
      preferredLang,
      loadRootGroups,
      loadGroupStacks,
      loadStackSpecies,
      loadSpeciesDetail,
    ],
  );

  const handleSelectionChange = useCallback(
    (state: FinderSelectionState) => {
      if (state.activeColumnIndex === null) return;
      const selectedInColumn =
        state.selectedItemsByColumn[state.activeColumnIndex] ?? [];
      if (state.activeItem?.type === "species" && selectedInColumn.length === 1) {
        const species = state.activeItem.payload as PinkkaSpeciesCard;
        onSelectSpecies?.(species);
      }
    },
    [onSelectSpecies],
  );

  return (
    <div className="relative flex h-full min-h-0 border border-border bg-background">
      <FinderColumns
        className="flex-1"
        rootItem={rootItem}
        typeConfigs={typeConfigs}
        onSelectionChange={handleSelectionChange}
      />
    </div>
  );
}
