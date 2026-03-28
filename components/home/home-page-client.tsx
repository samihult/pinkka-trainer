"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  getGroupScientificProgressSummaries,
  getGroups,
  getLearningItems,
  getStacks,
  getUserHomePreferences,
  updateUserHomePreferences,
} from "@/lib/firebase/firestore-helpers";
import type { Group, Stack } from "@/lib/types";
import { getLocalizedText } from "@/lib/content/content-display";
import { logFirestoreError } from "@/lib/utils";
import { useLanguagePreference } from "@/lib/language-context";
import { useI18n } from "@/lib/i18n";
import { toLanguageCode } from "@/lib/local-preferences";
import { useAuth } from "@/lib/auth-context";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

import { getEntityImageUrl } from "@/components/home/home-card-utils";
import { HomeGroupCard } from "@/components/home/home-group-card";

/**
 * Home page card view model for a group collection.
 * @property description Localized group description for filtering support.
 * @property href Optional fallback navigation target for opening the group.
 * @property id Group id.
 * @property imageUrl Hero image shown on the card.
 * @property masteryPercent Mastered scientific-name percentage for the group.
 * @property name Localized group name.
 * @property originalIndex Stable source ordering used after favorites are grouped first.
 * @property speciesCount Total species count across the group's stacks.
 */
interface HomeGroupCardViewModel {
  description: string;
  href?: string;
  id: string;
  imageUrl: string | null;
  masteryPercent: number;
  name: string;
  originalIndex: number;
  speciesCount: number;
}

/** Home page client component for selecting groups and stacks to learn. */
export function HomePageClient() {
  const { language } = useLanguagePreference();
  const { t } = useI18n();
  const preferredLanguage = toLanguageCode(language);
  const { user, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [allStacks, setAllStacks] = useState<Stack[]>([]);
  const [stackSpeciesCounts, setStackSpeciesCounts] = useState<
    Map<string, number>
  >(new Map());
  const [favoriteStates, setFavoriteStates] = useState<Record<string, boolean>>(
    {},
  );
  const [groupMasteryPercents, setGroupMasteryPercents] = useState<
    Map<string, number>
  >(new Map());
  const [groupSpeciesCounts, setGroupSpeciesCounts] = useState<
    Map<string, number>
  >(new Map());
  const [filterValue, setFilterValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingScrollFavoriteId, setPendingScrollFavoriteId] = useState<
    string | null
  >(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  const loadData = useCallback(async () => {
    try {
      if (!user) return;

      const [groupsData, stacksData, homePreferences] = await Promise.all([
        getGroups(),
        getStacks(),
        getUserHomePreferences(user.uid),
      ]);

      const visibleGroups = [...groupsData]
        .filter((group) => !group.isHidden)
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
      const initialStackSpeciesCounts = stacksData.reduce<Map<string, number>>(
        (accumulator, stack) => {
          accumulator.set(
            stack.id,
            Array.isArray(stack.speciesIds) ? stack.speciesIds.length : 0,
          );
          return accumulator;
        },
        new Map(),
      );

      setGroups(visibleGroups);
      setAllStacks(stacksData);
      setStackSpeciesCounts(initialStackSpeciesCounts);
      const favoriteGroupIds = new Set(homePreferences?.favoriteGroupIds ?? []);
      setFavoriteStates(
        visibleGroups.reduce<Record<string, boolean>>((accumulator, group) => {
          accumulator[group.id] = favoriteGroupIds.has(group.id);
          return accumulator;
        }, {}),
      );
      setLoading(false);
      const visibleGroupIds = visibleGroups.map((group) => group.id);
      const stacksMissingSpeciesCounts = stacksData.filter(
        (stack) =>
          !stack.isHidden &&
          (initialStackSpeciesCounts.get(stack.id) ??
            stack.speciesIds?.length ??
            0) === 0,
      );
      const [progressResult, stackSpeciesCountResult] =
        await Promise.allSettled([
          getGroupScientificProgressSummaries(user.uid, visibleGroupIds, {
            allowFallback: false,
          }),
          Promise.allSettled(
            stacksMissingSpeciesCounts.map(async (stack) => {
              const species = await getLearningItems(stack.id);
              return [stack.id, species.length] as const;
            }),
          ),
        ]);

      const progressMap =
        progressResult.status === "fulfilled"
          ? progressResult.value
          : new Map();

      setGroupMasteryPercents(
        new Map(
          [...progressMap.entries()].map(([groupId, progress]) => [
            groupId,
            progress.masteredScientificPercent,
          ]),
        ),
      );
      setGroupSpeciesCounts(
        new Map(
          [...progressMap.entries()].map(([groupId, progress]) => [
            groupId,
            progress.totalSpeciesCount,
          ]),
        ),
      );
      if (stackSpeciesCountResult.status === "fulfilled") {
        setStackSpeciesCounts((previous) => {
          const next = new Map(previous);
          stackSpeciesCountResult.value.forEach((result) => {
            if (result.status === "fulfilled") {
              const [stackId, count] = result.value;
              next.set(stackId, count);
            }
          });
          return next;
        });
      }
    } catch (error) {
      logFirestoreError("Failed to load learn page data", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    void loadData();
  }, [authLoading, loadData, user]);

  const stacksByGroup = useMemo(() => {
    return groups.reduce<Record<string, Stack[]>>((accumulator, group) => {
      const legacyStackIds = new Set(group.stackIds ?? []);
      accumulator[group.id] = [...allStacks]
        .filter(
          (stack) =>
            !stack.isHidden &&
            (stack.parentGroupId === group.id ||
              (stack.parentGroupId === undefined &&
                legacyStackIds.has(stack.id))),
        )
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
      return accumulator;
    }, {});
  }, [allStacks, groups]);

  const groupCards = useMemo<HomeGroupCardViewModel[]>(() => {
    return groups.map((group, index) => {
      const groupStacks = stacksByGroup[group.id] ?? [];
      const speciesCount =
        groupSpeciesCounts.get(group.id) ??
        groupStacks.reduce(
          (total, stack) =>
            total +
            (stackSpeciesCounts.get(stack.id) ?? stack.speciesIds?.length ?? 0),
          0,
        );
      const groupImageUrl =
        getEntityImageUrl(group.images) ??
        groupStacks
          .map(
            (stack) =>
              getEntityImageUrl(stack.images) ??
              getEntityImageUrl(stack.data.images),
          )
          .find(Boolean) ??
        null;
      return {
        description: getLocalizedText(
          group.data.description,
          preferredLanguage,
        ),
        href: groupStacks.length > 0 ? `/groups/${group.id}` : undefined,
        id: group.id,
        imageUrl: groupImageUrl,
        masteryPercent: groupMasteryPercents.get(group.id) ?? 0,
        name: getLocalizedText(group.data.name, preferredLanguage),
        originalIndex: index,
        speciesCount,
      };
    });
  }, [
    groupMasteryPercents,
    groupSpeciesCounts,
    groups,
    preferredLanguage,
    stackSpeciesCounts,
    stacksByGroup,
  ]);

  const sortedGroupCards = useMemo(() => {
    return [...groupCards].sort((left, right) => {
      const leftFavorite = favoriteStates[left.id] ? 1 : 0;
      const rightFavorite = favoriteStates[right.id] ? 1 : 0;
      if (leftFavorite !== rightFavorite) return rightFavorite - leftFavorite;
      return left.originalIndex - right.originalIndex;
    });
  }, [favoriteStates, groupCards]);

  const filteredGroupCards = useMemo(() => {
    const normalizedFilter = filterValue.trim().toLocaleLowerCase();
    if (!normalizedFilter) return sortedGroupCards;

    return sortedGroupCards.filter((group) =>
      [group.name, group.description].some((value) =>
        value.toLocaleLowerCase().includes(normalizedFilter),
      ),
    );
  }, [filterValue, sortedGroupCards]);

  const persistFavoriteState = useCallback(
    async (nextFavoriteStates: Record<string, boolean>) => {
      if (!user) return;

      const favoriteGroupIds = groups
        .filter((group) => nextFavoriteStates[group.id])
        .map((group) => group.id);

      await updateUserHomePreferences(user.uid, {
        favoriteGroupIds,
      });
    },
    [groups, user],
  );

  useEffect(() => {
    if (!pendingScrollFavoriteId || !favoriteStates[pendingScrollFavoriteId]) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const cardElement = cardRefs.current[pendingScrollFavoriteId];
      if (!cardElement) {
        setPendingScrollFavoriteId(null);
        return;
      }

      const { top, bottom } = cardElement.getBoundingClientRect();
      const isVisible = top >= 0 && bottom <= window.innerHeight;

      if (!isVisible) {
        cardElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }

      setPendingScrollFavoriteId(null);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [favoriteStates, filteredGroupCards, pendingScrollFavoriteId]);

  const handleFavoriteToggle = useCallback(
    async (groupId: string) => {
      const currentValue = favoriteStates[groupId] ?? false;
      const nextValue = !currentValue;
      const nextFavoriteStates = {
        ...favoriteStates,
        [groupId]: nextValue,
      };

      setFavoriteStates(nextFavoriteStates);
      setPendingScrollFavoriteId(nextValue ? groupId : null);

      try {
        await persistFavoriteState(nextFavoriteStates);
      } catch (error) {
        logFirestoreError("Failed to update favorite groups", error);
        setFavoriteStates(favoriteStates);
        setPendingScrollFavoriteId(null);
      }
    },
    [favoriteStates, persistFavoriteState],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingSpinner className="py-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-10 lg:py-12">
        <div className="mb-12 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <h1 className="text-5xl font-bold tracking-tight text-primary sm:text-6xl">
              {t("home.title")}
            </h1>
            <p className="max-w-2xl text-xl text-muted-foreground">
              {t("home.subtitle")}
            </p>
          </div>
          <div className="w-full max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-5 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filterValue}
                onChange={(event) => setFilterValue(event.target.value)}
                placeholder={t("home.filterPlaceholder")}
                className="h-16 rounded-full border-0 bg-muted/75 pr-6 pl-16 text-xl shadow-none placeholder:text-muted-foreground/80"
              />
            </div>
          </div>
        </div>

        {filteredGroupCards.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {filteredGroupCards.map((group) => (
              <HomeGroupCard
                cardRef={(node) => {
                  cardRefs.current[group.id] = node;
                }}
                key={group.id}
                href={group.href}
                imageUrl={group.imageUrl}
                isFavorite={favoriteStates[group.id] ?? false}
                masteryPercent={group.masteryPercent}
                name={group.name}
                onToggleFavorite={() => void handleFavoriteToggle(group.id)}
                speciesCount={group.speciesCount}
              />
            ))}
          </div>
        ) : (
          <Card className="max-w-2xl">
            <CardContent className="py-12 text-center text-muted-foreground">
              {groupCards.length === 0 ? (
                <>
                  <p className="mb-4">{t("home.noMaterialsTitle")}</p>
                  <p className="text-sm">{t("home.noMaterialsSubtitle")}</p>
                </>
              ) : (
                t("home.noCollectionsMatchFilter")
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
