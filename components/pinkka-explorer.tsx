"use client";

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
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedSubStackId, setSelectedSubStackId] = useState<number | null>(
    null,
  );
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<number | null>(
    null,
  );
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
    if (selectedGroupId === null) return;

    setSelectedSubStackId(null);
    setSelectedSpeciesId(null);

    if (subStacksByGroup[selectedGroupId]) return;

    let cancelled = false;
    const loadGroup = async () => {
      setLoadingSubStacks(true);
      setError(null);
      try {
        const groupDetail =
          await pinkkaApi.fetchGroupWithStacks(selectedGroupId);
        const subStacks =
          groupDetail?.subPinkkas
            ?.slice()
            .sort((a, b) => a.orderNo - b.orderNo) ?? [];
        if (!cancelled) {
          setSubStacksByGroup((prev) => ({
            ...prev,
            [selectedGroupId]: subStacks,
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
  }, [pinkkaApi, selectedGroupId, subStacksByGroup]);

  useEffect(() => {
    if (selectedSubStackId === null) return;

    setSelectedSpeciesId(null);

    if (speciesBySubStack[selectedSubStackId]) return;

    let cancelled = false;
    const loadSubStack = async () => {
      setLoadingSpecies(true);
      setError(null);
      try {
        const subStack = await pinkkaApi.fetchSubStack(selectedSubStackId);
        const speciesCards = subStack?.speciesCards ?? [];
        if (!cancelled) {
          setSpeciesBySubStack((prev) => ({
            ...prev,
            [selectedSubStackId]: speciesCards,
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
  }, [pinkkaApi, selectedSubStackId, speciesBySubStack]);

  useEffect(() => {
    if (selectedSpeciesId === null) return;
    if (speciesDetails[selectedSpeciesId]) return;

    let cancelled = false;
    const loadSpeciesDetail = async () => {
      setLoadingDetails(true);
      setError(null);
      try {
        const detail = await pinkkaApi.fetchSpecies(selectedSpeciesId);
        if (!cancelled) {
          setSpeciesDetails((prev) => ({
            ...prev,
            [selectedSpeciesId]: detail,
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
  }, [pinkkaApi, selectedSpeciesId, speciesDetails]);

  const selectedGroup = groups.find((group) => group.id === selectedGroupId);
  const subStacks = selectedGroupId
    ? (subStacksByGroup[selectedGroupId] ?? [])
    : [];
  const selectedSubStack = subStacks.find(
    (stack) => stack.id === selectedSubStackId,
  );
  const speciesCards = selectedSubStackId
    ? (speciesBySubStack[selectedSubStackId] ?? [])
    : [];
  const selectedSpecies = speciesCards.find(
    (species) => species.id === selectedSpeciesId,
  );
  const selectedSpeciesDetail =
    selectedSpeciesId !== null ? speciesDetails[selectedSpeciesId] : null;

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
                const isSelected = group.id === selectedGroupId;
                return (
                  <li key={group.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-primary/15 text-primary"
                          : "hover:bg-muted/60"
                      }`}
                    >
                      <MiddleEllipsisText
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
          {loadingSubStacks ? (
            <LoadingSpinner className="py-8" />
          ) : (
            <ul className="space-y-1 px-2 pb-4">
              {subStacks.map((stack) => {
                const label = getLocalizedText(stack.name, preferredLang);
                const isSelected = stack.id === selectedSubStackId;
                return (
                  <li key={stack.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedSubStackId(stack.id)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-primary/15 text-primary"
                          : "hover:bg-muted/60"
                      }`}
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
              {!selectedGroup && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  Select a group to view stacks.
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="flex h-full min-h-0 w-72 shrink-0 flex-col border-r bg-muted/10">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Species
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingSpecies ? (
            <LoadingSpinner className="py-8" />
          ) : (
            <ul className="space-y-1 px-2 pb-4">
              {speciesCards.map((species) => {
                const isSelected = species.id === selectedSpeciesId;
                const vernacular = getLocalizedText(
                  species.vernacularName,
                  preferredLang,
                );
                return (
                  <li key={species.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSpeciesId(species.id);
                        onSelectSpecies?.(species);
                      }}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-primary/15 text-primary"
                          : "hover:bg-muted/60"
                      }`}
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
              {!selectedSubStack && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  Select a stack to view species.
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="flex min-w-[280px] flex-1 flex-col bg-background">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Details
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingDetails ? (
            <LoadingSpinner className="py-8" />
          ) : selectedSpeciesDetail ? (
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
          ) : selectedSpecies ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              Loading details for {selectedSpecies.scientificName}...
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Select a species to preview details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
