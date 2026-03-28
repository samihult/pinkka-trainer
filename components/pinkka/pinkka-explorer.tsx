"use client";

/** Finder-style Pinkka explorer that keeps content loaders stable during status refreshes. */

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
  type FinderSelectionChangeMeta,
  type FinderSelectionState,
} from "@/components/finder-columns";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";
import { usePinkkaRootGroups } from "@/hooks/use-pinkka-root-groups";
import { usePinkkaGroupStacks } from "@/hooks/use-pinkka-group-stacks";
import { usePinkkaStackSpecies } from "@/hooks/use-pinkka-stack-species";
import { usePinkkaSpeciesDetail } from "@/hooks/use-pinkka-species-detail";
import { PinkkaImportStatusProvider } from "@/components/pinkka/pinkka-import-status-context";
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
  /** Controlled selected Pinkka group id. */
  selectedGroupId?: number | null;
  /** Controlled selected Pinkka stack id. */
  selectedStackId?: number | null;
  /** Controlled selected Pinkka species id. */
  selectedSpeciesId?: number | null;
  /** Called with selected ids when user selection changes. */
  onSelectedIdsChange?: (ids: {
    groupId: number | null;
    stackId: number | null;
    speciesId: number | null;
  }) => void;
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
  selectedGroupId,
  selectedStackId,
  selectedSpeciesId,
  onSelectedIdsChange,
}: PinkkaExplorerProps) {
  const pinkkaApi = useMemo(
    () => ({
      ...defaultApi,
      ...api,
    }),
    [api],
  );

  const { loadRootGroups, groupImportStatuses } = usePinkkaRootGroups(
    pinkkaApi.fetchGroups,
    {
      importStatusVersion,
    },
  );
  const { loadGroupStacks, stackImportStatusesByGroup } = usePinkkaGroupStacks(
    pinkkaApi.fetchGroupWithStacks,
    {
      importStatusVersion,
    },
  );
  const { loadStackSpecies, speciesImportStatusesByStack } =
    usePinkkaStackSpecies(pinkkaApi.fetchSubStack, {
      groupId: selectedGroupId,
      importStatusVersion,
    });
  const { loadSpeciesDetail } = usePinkkaSpeciesDetail(pinkkaApi.fetchSpecies);
  const rootItem = useMemo<FinderItem<null>>(
    () => ({
      id: "root",
      type: "root",
      payload: null,
    }),
    [],
  );

  const isControlledSelection =
    selectedGroupId !== undefined ||
    selectedStackId !== undefined ||
    selectedSpeciesId !== undefined;

  const selectedPath = useMemo(
    () =>
      isControlledSelection
        ? [
            selectedGroupId ?? null,
            selectedStackId ?? null,
            selectedSpeciesId ?? null,
          ]
        : undefined,
    [
      isControlledSelection,
      selectedGroupId,
      selectedSpeciesId,
      selectedStackId,
    ],
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
        loadChildren: loadGroupStacks,
      }),
    [preferredLang, loadGroupStacks],
  );

  const stackTypeConfig = useMemo(
    () =>
      createStackTypeConfig({
        preferredLang,
        loadChildren: loadStackSpecies,
      }),
    [loadStackSpecies, preferredLang],
  );

  const speciesTypeConfig = useMemo(
    () =>
      createSpeciesTypeConfig({
        preferredLang,
        loadChildren: loadSpeciesDetail,
      }),
    [loadSpeciesDetail, preferredLang],
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
    (
      state: FinderSelectionState,
      meta: FinderSelectionChangeMeta = { source: "system" },
    ) => {
      onSelectionChange?.(state);

      if (meta.source !== "user") {
        return;
      }

      const selectedItems = state.selectedItemsByColumn.flat();
      const groupItem = selectedItems.find((item) => item.type === "group");
      const stackItem = selectedItems.find((item) => item.type === "stack");
      const speciesItem = selectedItems.find((item) => item.type === "species");

      onSelectedIdsChange?.({
        groupId: groupItem ? Number(groupItem.id) : null,
        stackId: stackItem ? Number(stackItem.id) : null,
        speciesId: speciesItem ? Number(speciesItem.id) : null,
      });

      if (state.activeColumnIndex === null) return;
      const selectedInColumn =
        state.selectedItemsByColumn[state.activeColumnIndex] ?? [];
      if (
        state.activeItem?.type === "species" &&
        selectedInColumn.length === 1
      ) {
        const species = state.activeItem.payload as PinkkaSpeciesCard;
        onSelectSpecies?.(species);
      }
    },
    [onSelectSpecies, onSelectedIdsChange, onSelectionChange],
  );

  const importStatusContextValue = useMemo(
    () => ({
      version: importStatusVersion ?? 0,
      selectedGroupId: selectedGroupId ?? null,
      selectedStackId: selectedStackId ?? null,
      groupImportStatuses,
      stackImportStatusesByGroup,
      speciesImportStatusesByStack,
    }),
    [
      groupImportStatuses,
      importStatusVersion,
      selectedGroupId,
      selectedStackId,
      speciesImportStatusesByStack,
      stackImportStatusesByGroup,
    ],
  );

  return (
    <div className="relative flex h-full min-h-0 border border-border bg-background">
      <PinkkaImportStatusProvider value={importStatusContextValue}>
        <FinderColumns
          className="flex-1"
          rootItem={rootItem}
          typeConfigs={typeConfigs}
          onSelectionChange={handleSelectionChange}
          selectedPath={selectedPath}
          selectionMode={isControlledSelection ? "single" : "multiple"}
        />
      </PinkkaImportStatusProvider>
    </div>
  );
}
