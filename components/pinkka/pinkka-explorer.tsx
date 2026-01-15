"use client";

import { useCallback, useMemo } from "react";
import {
  fetchPinkkaGroups,
  fetchPinkkaGroupWithStacks,
  fetchPinkkaSpecies,
  fetchPinkkaSubStack,
  type PinkkaSpeciesCard,
} from "@/lib/pinkka/pinkka-api";
import {
  FinderColumns,
  type FinderItem,
  type FinderSelectionState,
} from "@/components/finder-columns";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";
import { usePinkkaRootGroups } from "@/hooks/use-pinkka-root-groups";
import { usePinkkaGroupStacks } from "@/hooks/use-pinkka-group-stacks";
import { usePinkkaStackSpecies } from "@/hooks/use-pinkka-stack-species";
import { usePinkkaSpeciesDetail } from "@/hooks/use-pinkka-species-detail";
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
  /** Callback when selection state changes. */
  onSelectionChange?: (state: FinderSelectionState) => void;
  /** Optional version to refresh import status indicators. */
  importStatusVersion?: number;
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
  onSelectionChange,
  importStatusVersion,
  api,
}: PinkkaExplorerProps) {
  const pinkkaApi = useMemo(
    () => ({
      ...defaultApi,
      ...api,
    }),
    [api],
  );

  const { loadRootGroups } = usePinkkaRootGroups(pinkkaApi.fetchGroups);
  const { loadGroupStacks } = usePinkkaGroupStacks(
    pinkkaApi.fetchGroupWithStacks,
  );
  const { loadStackSpecies } = usePinkkaStackSpecies(pinkkaApi.fetchSubStack);
  const { loadSpeciesDetail } = usePinkkaSpeciesDetail(pinkkaApi.fetchSpecies);
  const rootItem = useMemo<FinderItem<null>>(
    () => ({
      id: "root",
      type: "root",
      payload: null,
    }),
    [],
  );


  const rootTypeConfig = useMemo(
    () =>
      createRootTypeConfig({
        loadChildren: loadRootGroups,
      }),
    [loadRootGroups],
  );

  const groupTypeConfig = useMemo(
    () =>
      createGroupTypeConfig({
        preferredLang,
        importStatusVersion,
        loadChildren: loadGroupStacks,
      }),
    [preferredLang, importStatusVersion, loadGroupStacks],
  );

  const stackTypeConfig = useMemo(
    () =>
      createStackTypeConfig({
        preferredLang,
        importStatusVersion,
        loadChildren: loadStackSpecies,
      }),
    [preferredLang, importStatusVersion, loadStackSpecies],
  );

  const speciesTypeConfig = useMemo(
    () =>
      createSpeciesTypeConfig({
        preferredLang,
        importStatusVersion,
        loadChildren: loadSpeciesDetail,
      }),
    [preferredLang, importStatusVersion, loadSpeciesDetail],
  );

  const speciesDetailTypeConfig = useMemo(
    () => createSpeciesDetailTypeConfig({ preferredLang }),
    [preferredLang],
  );

  const typeConfigs = useMemo(
    () => ({
      root: rootTypeConfig,
      group: groupTypeConfig,
      stack: stackTypeConfig,
      species: speciesTypeConfig,
      "species-detail": speciesDetailTypeConfig,
    }),
    [
      rootTypeConfig,
      groupTypeConfig,
      stackTypeConfig,
      speciesTypeConfig,
      speciesDetailTypeConfig,
    ],
  );

  const handleSelectionChange = useCallback(
    (state: FinderSelectionState) => {
      onSelectionChange?.(state);
      if (state.activeColumnIndex === null) return;
      const selectedInColumn =
        state.selectedItemsByColumn[state.activeColumnIndex] ?? [];
      if (state.activeItem?.type === "species" && selectedInColumn.length === 1) {
        const species = state.activeItem.payload as PinkkaSpeciesCard;
        onSelectSpecies?.(species);
      }
    },
    [onSelectSpecies, onSelectionChange],
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
