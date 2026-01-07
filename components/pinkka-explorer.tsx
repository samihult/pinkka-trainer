"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchPinkkaGroups,
  fetchPinkkaGroupWithStacks,
  fetchPinkkaSpecies,
  fetchPinkkaSubStack,
  getLocalizedText,
  type PinkkaGroup,
  type PinkkaSpeciesCard,
  type PinkkaSpeciesDetail,
  type PinkkaSubStack,
} from "@/lib/pinkka/pinkka-api";
import { LoadingSpinner } from "@/components/loading-spinner";
import { MiddleEllipsisText } from "@/components/middle-ellipsis-text";
import {
  FinderColumns,
  type FinderItem,
  type FinderSelectionState,
} from "@/components/finder-columns";

type PinkkaLanguage = "fi" | "en" | "sv";

type PinkkaApi = {
  fetchGroups: typeof fetchPinkkaGroups;
  fetchGroupWithStacks: typeof fetchPinkkaGroupWithStacks;
  fetchSubStack: typeof fetchPinkkaSubStack;
  fetchSpecies: typeof fetchPinkkaSpecies;
};

interface PinkkaExplorerProps {
  preferredLang?: PinkkaLanguage;
  onSelectSpecies?: (species: PinkkaSpeciesCard) => void;
  api?: Partial<PinkkaApi>;
}

const defaultApi: PinkkaApi = {
  fetchGroups: fetchPinkkaGroups,
  fetchGroupWithStacks: fetchPinkkaGroupWithStacks,
  fetchSubStack: fetchPinkkaSubStack,
  fetchSpecies: fetchPinkkaSpecies,
};

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

  const [groups, setGroups] = useState<PinkkaGroup[]>([]);
  const [activeSpeciesId, setActiveSpeciesId] = useState<number | null>(null);
  const [activeSpeciesCard, setActiveSpeciesCard] =
    useState<PinkkaSpeciesCard | null>(null);
  const [selectedSpeciesCount, setSelectedSpeciesCount] = useState(0);
  const [subStacksByGroup, setSubStacksByGroup] = useState<
    Record<number, PinkkaSubStack[]>
  >({});
  const [speciesBySubStack, setSpeciesBySubStack] = useState<
    Record<number, PinkkaSpeciesCard[]>
  >({});
  const [speciesDetails, setSpeciesDetails] = useState<
    Record<number, PinkkaSpeciesDetail | null>
  >({});
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadGroups = async () => {
      setLoadingGroups(true);
      setGroupError(null);
      try {
        const data = await pinkkaApi.fetchGroups();
        if (!cancelled) {
          setGroups(data);
        }
      } catch (err) {
        if (!cancelled) {
          setGroupError("Failed to load Pinkka groups.");
        }
      } finally {
        if (!cancelled) {
          setLoadingGroups(false);
        }
      }
    };

    loadGroups();
    return () => {
      cancelled = true;
    };
  }, [pinkkaApi]);

  useEffect(() => {
    if (activeSpeciesId === null) return;
    if (speciesDetails[activeSpeciesId]) return;

    let cancelled = false;
    const loadSpeciesDetail = async () => {
      setLoadingDetails(true);
      setDetailError(null);
      try {
        const detail = await pinkkaApi.fetchSpecies(activeSpeciesId);
        if (!cancelled) {
          setSpeciesDetails((prev) => ({
            ...prev,
            [activeSpeciesId]: detail,
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setDetailError("Failed to load species details.");
        }
      } finally {
        if (!cancelled) {
          setLoadingDetails(false);
        }
      }
    };

    loadSpeciesDetail();
    return () => {
      cancelled = true;
    };
  }, [pinkkaApi, activeSpeciesId, speciesDetails]);

  const selectedSpeciesDetail =
    activeSpeciesId !== null ? speciesDetails[activeSpeciesId] : null;

  const rootItems = useMemo<FinderItem<PinkkaGroup>[]>(
    () =>
      groups.map((group) => ({
        id: group.id,
        type: "group",
        payload: group,
      })),
    [groups],
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

  const columnOrder = useMemo(() => ["group", "stack", "species"], []);

  const typeConfigs = useMemo(
    () => ({
      group: {
        columnTitle: "Groups",
        columnClassName: "bg-muted/20",
        childType: "stack",
        noSelectionMessage: "Select a group to view stacks.",
        multiSelectMessage:
          "Multiple groups selected. Choose a single group to view stacks.",
        renderItem: (item: FinderItem<PinkkaGroup>) => {
          const label = getLocalizedText(item.payload.name, preferredLang);
          return (
            <MiddleEllipsisText
              className="font-medium"
              text={label || `Group ${item.payload.id}`}
            />
          );
        },
        loadChildren: loadGroupStacks,
      },
      stack: {
        columnTitle: "Stacks",
        columnClassName: "bg-background",
        childType: "species",
        emptyMessage: "No stacks available.",
        noSelectionMessage: "Select a stack to view species.",
        multiSelectMessage:
          "Multiple stacks selected. Choose a single stack to view species.",
        renderItem: (item: FinderItem<PinkkaSubStack>) => {
          const label = getLocalizedText(item.payload.name, preferredLang);
          return (
            <>
              <MiddleEllipsisText
                className="font-medium"
                text={label || `Stack ${item.payload.id}`}
              />
              <div className="text-xs text-muted-foreground">
                {getLocalizedText(item.payload.description, preferredLang)}
              </div>
            </>
          );
        },
        loadChildren: loadStackSpecies,
      },
      species: {
        columnTitle: "Species",
        columnClassName: "bg-muted/10",
        emptyMessage: "No species available.",
        renderItem: (item: FinderItem<PinkkaSpeciesCard>) => {
          const vernacular = getLocalizedText(
            item.payload.vernacularName,
            preferredLang,
          );
          return (
            <>
              <MiddleEllipsisText
                className="font-medium"
                text={item.payload.scientificName}
              />
              {vernacular && (
                <MiddleEllipsisText
                  className="text-xs text-muted-foreground"
                  text={vernacular}
                />
              )}
            </>
          );
        },
      },
    }),
    [preferredLang, loadGroupStacks, loadStackSpecies],
  );

  const handleSelectionChange = useCallback(
    (state: FinderSelectionState) => {
      const speciesColumnIndex = columnOrder.indexOf("species");
      const selectedSpecies =
        state.selectedItemsByColumn[speciesColumnIndex] ?? [];
      setSelectedSpeciesCount(selectedSpecies.length);
      setDetailError(null);

      if (state.activeItem?.type === "species" && selectedSpecies.length === 1) {
        const species = state.activeItem.payload as PinkkaSpeciesCard;
        setActiveSpeciesId(species.id);
        setActiveSpeciesCard(species);
        onSelectSpecies?.(species);
      } else {
        setActiveSpeciesId(null);
        setActiveSpeciesCard(null);
        setLoadingDetails(false);
      }
    },
    [columnOrder, onSelectSpecies],
  );

  return (
    <div className="relative flex h-full min-h-0 border border-border bg-background">
      {groupError && (
        <div className="absolute left-4 top-4 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {groupError}
        </div>
      )}
      <FinderColumns
        className="flex-1"
        rootItems={rootItems}
        typeConfigs={typeConfigs}
        columnOrder={columnOrder}
        rootLoading={loadingGroups}
        rootError={groupError}
        onSelectionChange={handleSelectionChange}
        renderTrailing={() => (
          <div className="flex min-w-[280px] flex-1 flex-col bg-background">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Details
            </div>
            <div className="flex-1 overflow-y-auto">
              {selectedSpeciesCount > 1 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Multiple species selected. Choose a single species to view
                  details.
                </div>
              )}
              {detailError && selectedSpeciesCount === 1 ? (
                <div className="px-3 py-2 text-sm text-destructive">
                  {detailError}
                </div>
              ) : null}
              {selectedSpeciesCount === 1 && loadingDetails ? (
                <LoadingSpinner className="py-8" />
              ) : null}
              {selectedSpeciesCount === 1 && selectedSpeciesDetail ? (
                <div className="space-y-4 px-4 pb-6 pt-2 text-sm">
                  <div>
                    <div className="text-lg font-semibold">
                      {selectedSpeciesDetail.scientificName}
                    </div>
                    <div className="text-muted-foreground">
                      {getLocalizedText(
                        selectedSpeciesDetail.vernacularName,
                        preferredLang,
                      )}
                    </div>
                  </div>
                  {selectedSpeciesDetail.description?.map((section) => (
                    <div key={section.predicate} className="space-y-1">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        {getLocalizedText(section.title, preferredLang)}
                      </div>
                      <div className="text-sm text-foreground">
                        {getLocalizedText(section.body, preferredLang)}
                      </div>
                    </div>
                  ))}
                  {!selectedSpeciesDetail.description?.length && (
                    <div className="text-muted-foreground">
                      No description available for this species.
                    </div>
                  )}
                </div>
              ) : selectedSpeciesCount === 1 && activeSpeciesCard ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  Loading details for {activeSpeciesCard.scientificName}...
                </div>
              ) : selectedSpeciesCount === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Select a species to preview details.
                </div>
              ) : null}
            </div>
          </div>
        )}
      />
    </div>
  );
}
