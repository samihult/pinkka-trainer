"use client";

import type React from "react";

import { useEffect, useMemo, useState } from "react";
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
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [selectedSubStackIds, setSelectedSubStackIds] = useState<number[]>([]);
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState<number[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [activeSubStackId, setActiveSubStackId] = useState<number | null>(null);
  const [activeSpeciesId, setActiveSpeciesId] = useState<number | null>(null);
  const [activeColumn, setActiveColumn] = useState<
    "groups" | "stacks" | "species" | null
  >(null);
  const [groupAnchorId, setGroupAnchorId] = useState<number | null>(null);
  const [subStackAnchorId, setSubStackAnchorId] = useState<number | null>(null);
  const [speciesAnchorId, setSpeciesAnchorId] = useState<number | null>(null);
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
  const [loadingSubStacks, setLoadingSubStacks] = useState(false);
  const [loadingSpecies, setLoadingSpecies] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadGroups = async () => {
      setLoadingGroups(true);
      setError(null);
      try {
        const data = await pinkkaApi.fetchGroups();
        if (!cancelled) {
          setGroups(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load Pinkka groups.");
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
    if (activeGroupId === null) return;

    setSelectedSubStackIds([]);
    setSelectedSpeciesIds([]);
    setActiveSubStackId(null);
    setActiveSpeciesId(null);

    if (subStacksByGroup[activeGroupId]) return;

    let cancelled = false;
    const loadGroup = async () => {
      setLoadingSubStacks(true);
      setError(null);
      try {
        const groupDetail =
          await pinkkaApi.fetchGroupWithStacks(activeGroupId);
        const subStacks =
          groupDetail?.subPinkkas
            ?.slice()
            .sort((a, b) => a.orderNo - b.orderNo) ?? [];
        if (!cancelled) {
          setSubStacksByGroup((prev) => ({
            ...prev,
            [activeGroupId]: subStacks,
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load stacks for the selected group.");
        }
      } finally {
        if (!cancelled) {
          setLoadingSubStacks(false);
        }
      }
    };

    loadGroup();
    return () => {
      cancelled = true;
    };
  }, [pinkkaApi, activeGroupId, subStacksByGroup]);

  useEffect(() => {
    if (activeSubStackId === null) return;

    setSelectedSpeciesIds([]);
    setActiveSpeciesId(null);

    if (speciesBySubStack[activeSubStackId]) return;

    let cancelled = false;
    const loadSubStack = async () => {
      setLoadingSpecies(true);
      setError(null);
      try {
        const subStack = await pinkkaApi.fetchSubStack(activeSubStackId);
        const speciesCards = subStack?.speciesCards ?? [];
        if (!cancelled) {
          setSpeciesBySubStack((prev) => ({
            ...prev,
            [activeSubStackId]: speciesCards,
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load species for the selected stack.");
        }
      } finally {
        if (!cancelled) {
          setLoadingSpecies(false);
        }
      }
    };

    loadSubStack();
    return () => {
      cancelled = true;
    };
  }, [pinkkaApi, activeSubStackId, speciesBySubStack]);

  useEffect(() => {
    if (activeSpeciesId === null) return;
    if (speciesDetails[activeSpeciesId]) return;

    let cancelled = false;
    const loadSpeciesDetail = async () => {
      setLoadingDetails(true);
      setError(null);
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
          setError("Failed to load species details.");
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

  const selectedGroup = groups.find((group) => group.id === activeGroupId);
  const subStacks = activeGroupId
    ? (subStacksByGroup[activeGroupId] ?? [])
    : [];
  const selectedSubStack = subStacks.find(
    (stack) => stack.id === activeSubStackId,
  );
  const speciesCards = activeSubStackId
    ? (speciesBySubStack[activeSubStackId] ?? [])
    : [];
  const selectedSpecies = speciesCards.find(
    (species) => species.id === activeSpeciesId,
  );
  const selectedSpeciesDetail =
    activeSpeciesId !== null ? speciesDetails[activeSpeciesId] : null;

  const groupIds = groups.map((group) => group.id);
  const subStackIds = subStacks.map((stack) => stack.id);
  const speciesIds = speciesCards.map((species) => species.id);

  const canShowStacks = selectedGroupIds.length === 1 && activeGroupId !== null;
  const canShowSpecies =
    selectedSubStackIds.length === 1 && activeSubStackId !== null;
  const canShowDetails =
    selectedSpeciesIds.length === 1 && activeSpeciesId !== null;

  const getSelectionClass = (
    isSelected: boolean,
    column: "groups" | "stacks" | "species",
  ) => {
    if (!isSelected) {
      return "hover:bg-muted/60";
    }
    if (activeColumn === column) {
      return "bg-primary/15 text-primary";
    }
    return "bg-muted/60 text-foreground";
  };

  const getNextSelection = (
    ids: number[],
    selectedIds: number[],
    targetId: number,
    anchorId: number | null,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    const isMeta = event.metaKey || event.ctrlKey;
    const isShift = event.shiftKey;
    let nextSelectedIds: number[] = [];
    let nextAnchorId = anchorId;
    let nextActiveId: number | null = targetId;

    if (isShift && anchorId !== null) {
      const startIndex = ids.indexOf(anchorId);
      const endIndex = ids.indexOf(targetId);
      if (startIndex !== -1 && endIndex !== -1) {
        const [start, end] =
          startIndex <= endIndex
            ? [startIndex, endIndex]
            : [endIndex, startIndex];
        nextSelectedIds = ids.slice(start, end + 1);
      } else {
        nextSelectedIds = [targetId];
        nextAnchorId = targetId;
      }
    } else if (isMeta) {
      if (selectedIds.includes(targetId)) {
        nextSelectedIds = selectedIds.filter((id) => id !== targetId);
      } else {
        nextSelectedIds = [...selectedIds, targetId];
      }
      nextAnchorId = targetId;
    } else {
      nextSelectedIds = [targetId];
      nextAnchorId = targetId;
    }

    if (nextSelectedIds.length === 0) {
      nextActiveId = null;
    } else if (!nextSelectedIds.includes(targetId)) {
      nextActiveId = nextSelectedIds[nextSelectedIds.length - 1] ?? null;
    }

    return { nextSelectedIds, nextAnchorId, nextActiveId };
  };

  const handleGroupSelect = (
    event: React.MouseEvent<HTMLButtonElement>,
    groupId: number,
  ) => {
    const { nextSelectedIds, nextAnchorId, nextActiveId } = getNextSelection(
      groupIds,
      selectedGroupIds,
      groupId,
      groupAnchorId,
      event,
    );
    setSelectedGroupIds(nextSelectedIds);
    setGroupAnchorId(nextAnchorId);
    setActiveGroupId(nextActiveId);
    setActiveColumn("groups");
    setSelectedSubStackIds([]);
    setSelectedSpeciesIds([]);
    setActiveSubStackId(null);
    setActiveSpeciesId(null);
  };

  const handleSubStackSelect = (
    event: React.MouseEvent<HTMLButtonElement>,
    stackId: number,
  ) => {
    const { nextSelectedIds, nextAnchorId, nextActiveId } = getNextSelection(
      subStackIds,
      selectedSubStackIds,
      stackId,
      subStackAnchorId,
      event,
    );
    setSelectedSubStackIds(nextSelectedIds);
    setSubStackAnchorId(nextAnchorId);
    setActiveSubStackId(nextActiveId);
    setActiveColumn("stacks");
    setSelectedSpeciesIds([]);
    setActiveSpeciesId(null);
  };

  const handleSpeciesSelect = (
    event: React.MouseEvent<HTMLButtonElement>,
    speciesId: number,
  ) => {
    const { nextSelectedIds, nextAnchorId, nextActiveId } = getNextSelection(
      speciesIds,
      selectedSpeciesIds,
      speciesId,
      speciesAnchorId,
      event,
    );
    setSelectedSpeciesIds(nextSelectedIds);
    setSpeciesAnchorId(nextAnchorId);
    setActiveSpeciesId(nextActiveId);
    setActiveColumn("species");
    if (nextActiveId !== null) {
      const selected = speciesCards.find(
        (species) => species.id === nextActiveId,
      );
      if (selected) {
        onSelectSpecies?.(selected);
      }
    }
  };

  return (
    <div className="relative flex h-full min-h-0 overflow-x-auto border border-border bg-background">
      {error && (
        <div className="absolute left-4 top-4 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex h-full min-h-0 w-72 shrink-0 flex-col border-r bg-muted/20">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Groups
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingGroups ? (
            <LoadingSpinner className="py-8" />
          ) : (
            <ul className="space-y-1 px-2 pb-4">
              {groups.map((group) => {
                const label = getLocalizedText(group.name, preferredLang);
                const isSelected = selectedGroupIds.includes(group.id);
                return (
                  <li key={group.id}>
                    <button
                      type="button"
                      onClick={(event) => handleGroupSelect(event, group.id)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${getSelectionClass(
                        isSelected,
                        "groups",
                      )}`}
                    >
                      <MiddleEllipsisText
                        className="font-medium"
                        text={label || `Group ${group.id}`}
                      />
                    </button>
                  </li>
                );
              })}
              {groups.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  No groups available.
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="flex h-full min-h-0 w-72 shrink-0 flex-col border-r bg-background">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Stacks
        </div>
        <div className="flex-1 overflow-y-auto">
          {!selectedGroupIds.length && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Select a group to view stacks.
            </div>
          )}
          {selectedGroupIds.length > 1 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Multiple groups selected. Choose a single group to view stacks.
            </div>
          )}
          {canShowStacks && loadingSubStacks ? (
            <LoadingSpinner className="py-8" />
          ) : null}
          {canShowStacks && !loadingSubStacks ? (
            <ul className="space-y-1 px-2 pb-4">
              {subStacks.map((stack) => {
                const label = getLocalizedText(stack.name, preferredLang);
                const isSelected = selectedSubStackIds.includes(stack.id);
                return (
                  <li key={stack.id}>
                    <button
                      type="button"
                      onClick={(event) => handleSubStackSelect(event, stack.id)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${getSelectionClass(
                        isSelected,
                        "stacks",
                      )}`}
                    >
                      <MiddleEllipsisText
                        className="font-medium"
                        text={label || `Stack ${stack.id}`}
                      />
                      <div className="text-xs text-muted-foreground">
                        {getLocalizedText(stack.description, preferredLang)}
                      </div>
                    </button>
                  </li>
                );
              })}
              {selectedGroup && subStacks.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  No stacks available.
                </li>
              )}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="flex h-full min-h-0 w-72 shrink-0 flex-col border-r bg-muted/10">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Species
        </div>
        <div className="flex-1 overflow-y-auto">
          {!selectedSubStackIds.length && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Select a stack to view species.
            </div>
          )}
          {selectedSubStackIds.length > 1 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Multiple stacks selected. Choose a single stack to view species.
            </div>
          )}
          {canShowSpecies && loadingSpecies ? (
            <LoadingSpinner className="py-8" />
          ) : null}
          {canShowSpecies && !loadingSpecies ? (
            <ul className="space-y-1 px-2 pb-4">
              {speciesCards.map((species) => {
                const isSelected = selectedSpeciesIds.includes(species.id);
                const vernacular = getLocalizedText(
                  species.vernacularName,
                  preferredLang,
                );
                return (
                  <li key={species.id}>
                    <button
                      type="button"
                      onClick={(event) =>
                        handleSpeciesSelect(event, species.id)
                      }
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${getSelectionClass(
                        isSelected,
                        "species",
                      )}`}
                    >
                      <MiddleEllipsisText
                        className="font-medium"
                        text={species.scientificName}
                      />
                      {vernacular && (
                        <MiddleEllipsisText
                          className="text-xs text-muted-foreground"
                          text={vernacular}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
              {selectedSubStack && speciesCards.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  No species available.
                </li>
              )}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-[280px] flex-1 flex-col bg-background">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Details
        </div>
        <div className="flex-1 overflow-y-auto">
          {selectedSpeciesIds.length > 1 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Multiple species selected. Choose a single species to view
              details.
            </div>
          )}
          {canShowDetails && loadingDetails ? (
            <LoadingSpinner className="py-8" />
          ) : null}
          {canShowDetails && !loadingDetails && selectedSpeciesDetail ? (
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
          ) : canShowDetails && selectedSpecies ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              Loading details for {selectedSpecies.scientificName}...
            </div>
          ) : selectedSpeciesIds.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Select a species to preview details.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
