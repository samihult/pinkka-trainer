/** Group page client renders one collection and its favorite-sorted stack cards. */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

import { getEntityImageUrl } from "@/components/home/home-card-utils";
import { HomeStackCard } from "@/components/home/home-stack-card";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { getLocalizedText } from "@/lib/content/content-display";
import {
  getGroup,
  getSpecies,
  getStackScientificProgressSummaries,
  getStacks,
  getUserHomePreferences,
  updateUserHomePreferences,
} from "@/lib/firebase/firestore-helpers";
import { useI18n } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";
import type { Group, Stack } from "@/lib/types";
import { logFirestoreError } from "@/lib/utils";

/**
 * Stack card view model for the collection detail page.
 * @property description Localized stack description for filtering support.
 * @property id Stack id.
 * @property imageUrl Hero image shown on the card.
 * @property learnHref Link to the learn-cards flow.
 * @property masteryPercent Mastered scientific-name percentage shown in the footer.
 * @property name Localized stack name.
 * @property originalIndex Stable source ordering used after favorites are grouped first.
 * @property speciesCount Total number of species in the stack.
 * @property testHref Link to the test flow.
 */
interface GroupStackCardViewModel {
  description: string;
  id: string;
  imageUrl: string | null;
  learnHref: string;
  masteryPercent: number;
  name: string;
  originalIndex: number;
  speciesCount: number;
  testHref: string;
}

/**
 * Props for the GroupPageClient component.
 * @property groupId Id of the collection to render.
 */
interface GroupPageClientProps {
  groupId: string;
}

/** Learner-facing collection page with filterable favorite-sorted stack cards. */
export function GroupPageClient({ groupId }: GroupPageClientProps) {
  const { language } = useLanguagePreference();
  const { t } = useI18n();
  const preferredLanguage = toLanguageCode(language);
  const { user, loading: authLoading } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [stackSpeciesCounts, setStackSpeciesCounts] = useState<
    Map<string, number>
  >(new Map());
  const [favoriteStates, setFavoriteStates] = useState<Record<string, boolean>>(
    {},
  );
  const [favoriteStackIds, setFavoriteStackIds] = useState<string[]>([]);
  const [stackMasteryPercents, setStackMasteryPercents] = useState<
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

      const [groupData, stacksData, homePreferences] = await Promise.all([
        getGroup(groupId),
        getStacks(groupId),
        getUserHomePreferences(user.uid),
      ]);

      const visibleStacks = [...stacksData]
        .filter((stack) => !stack.isHidden)
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
      const resolvedCounts = await Promise.allSettled(
        visibleStacks.map(async (stack) => {
          if (Array.isArray(stack.speciesIds) && stack.speciesIds.length > 0) {
            return [stack.id, stack.speciesIds.length] as const;
          }

          const species = await getSpecies(stack.id);
          return [stack.id, species.length] as const;
        }),
      );

      const persistedFavoriteStackIds = homePreferences?.favoriteStackIds ?? [];

      setGroup(groupData && !groupData.isHidden ? groupData : null);
      setStacks(visibleStacks);
      setStackSpeciesCounts(
        resolvedCounts.reduce<Map<string, number>>((accumulator, entry) => {
          if (entry.status === "fulfilled") {
            const [stackId, count] = entry.value;
            accumulator.set(stackId, count);
          }
          return accumulator;
        }, new Map()),
      );
      setFavoriteStates(
        visibleStacks.reduce<Record<string, boolean>>((accumulator, stack) => {
          accumulator[stack.id] = persistedFavoriteStackIds.includes(stack.id);
          return accumulator;
        }, {}),
      );
      setFavoriteStackIds(persistedFavoriteStackIds);
      const progressMap = await getStackScientificProgressSummaries(
        user.uid,
        visibleStacks.map((stack) => stack.id),
      );
      setStackMasteryPercents(
        new Map(
          [...progressMap.entries()].map(([stackId, progress]) => [
            stackId,
            progress.masteredScientificPercent,
          ]),
        ),
      );
    } catch (error) {
      logFirestoreError("Failed to load collection page data", error);
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    void loadData();
  }, [authLoading, loadData, user]);

  const stackCards = useMemo<GroupStackCardViewModel[]>(() => {
    return stacks.map((stack, index) => {
      return {
        description: getLocalizedText(
          stack.data.description,
          preferredLanguage,
        ),
        id: stack.id,
        imageUrl:
          getEntityImageUrl(stack.images) ??
          getEntityImageUrl(stack.data.images) ??
          null,
        learnHref: `/learn/cards/${stack.id}?groupId=${encodeURIComponent(groupId)}`,
        masteryPercent: stackMasteryPercents.get(stack.id) ?? 0,
        name: getLocalizedText(stack.data.name, preferredLanguage),
        originalIndex: index,
        speciesCount:
          stackSpeciesCounts.get(stack.id) ?? stack.speciesIds?.length ?? 0,
        testHref: `/learn/tests/${stack.id}?groupId=${encodeURIComponent(groupId)}`,
      };
    });
  }, [
    groupId,
    preferredLanguage,
    stackMasteryPercents,
    stackSpeciesCounts,
    stacks,
  ]);

  const sortedStackCards = useMemo(() => {
    return [...stackCards].sort((left, right) => {
      const leftFavorite = favoriteStates[left.id] ? 1 : 0;
      const rightFavorite = favoriteStates[right.id] ? 1 : 0;
      if (leftFavorite !== rightFavorite) return rightFavorite - leftFavorite;
      return left.originalIndex - right.originalIndex;
    });
  }, [favoriteStates, stackCards]);

  const filteredStackCards = useMemo(() => {
    const normalizedFilter = filterValue.trim().toLocaleLowerCase();
    if (!normalizedFilter) return sortedStackCards;

    return sortedStackCards.filter((stack) =>
      [stack.name, stack.description].some((value) =>
        value.toLocaleLowerCase().includes(normalizedFilter),
      ),
    );
  }, [filterValue, sortedStackCards]);

  const buildNextFavoriteStackIds = useCallback(
    (nextFavoriteStates: Record<string, boolean>) => {
      const currentGroupStackIds = new Set(stacks.map((stack) => stack.id));
      const preservedFavoriteIds = favoriteStackIds.filter(
        (stackId) => !currentGroupStackIds.has(stackId),
      );
      const currentGroupFavoriteIds = stacks
        .filter((stack) => nextFavoriteStates[stack.id])
        .map((stack) => stack.id);

      return [...preservedFavoriteIds, ...currentGroupFavoriteIds];
    },
    [favoriteStackIds, stacks],
  );

  const persistFavoriteState = useCallback(
    async (nextFavoriteStates: Record<string, boolean>) => {
      if (!user) return;

      await updateUserHomePreferences(user.uid, {
        favoriteStackIds: buildNextFavoriteStackIds(nextFavoriteStates),
      });
    },
    [buildNextFavoriteStackIds, user],
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
  }, [favoriteStates, filteredStackCards, pendingScrollFavoriteId]);

  const handleFavoriteToggle = useCallback(
    async (stackId: string) => {
      const previousFavoriteStates = favoriteStates;
      const previousFavoriteStackIds = favoriteStackIds;
      const nextValue = !(favoriteStates[stackId] ?? false);
      const nextFavoriteStates = {
        ...favoriteStates,
        [stackId]: nextValue,
      };
      const nextFavoriteStackIds =
        buildNextFavoriteStackIds(nextFavoriteStates);

      setFavoriteStates(nextFavoriteStates);
      setFavoriteStackIds(nextFavoriteStackIds);
      setPendingScrollFavoriteId(nextValue ? stackId : null);

      try {
        await persistFavoriteState(nextFavoriteStates);
      } catch (error) {
        logFirestoreError("Failed to update favorite stacks", error);
        setFavoriteStates(previousFavoriteStates);
        setFavoriteStackIds(previousFavoriteStackIds);
        setPendingScrollFavoriteId(null);
      }
    },
    [
      buildNextFavoriteStackIds,
      favoriteStackIds,
      favoriteStates,
      persistFavoriteState,
    ],
  );

  const groupName = group
    ? getLocalizedText(group.data.name, preferredLanguage)
    : t("group.notFoundTitle");
  const groupDescription = group
    ? getLocalizedText(group.data.description, preferredLanguage)
    : t("group.notFoundDescription");

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
        <div className="mb-12 space-y-6">
          <Button asChild variant="ghost" className="-ml-3 w-fit text-base">
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
              {t("group.backToHome")}
            </Link>
          </Button>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <h1 className="text-5xl font-bold tracking-tight text-primary sm:text-6xl">
                {groupName}
              </h1>
              <p className="max-w-3xl text-xl text-muted-foreground">
                {groupDescription}
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
        </div>

        {group ? (
          filteredStackCards.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {filteredStackCards.map((stack) => (
                <HomeStackCard
                  cardRef={(node) => {
                    cardRefs.current[stack.id] = node;
                  }}
                  key={stack.id}
                  imageUrl={stack.imageUrl}
                  isFavorite={favoriteStates[stack.id] ?? false}
                  learnHref={stack.learnHref}
                  masteryPercent={stack.masteryPercent}
                  name={stack.name}
                  onToggleFavorite={() => void handleFavoriteToggle(stack.id)}
                  speciesCount={stack.speciesCount}
                  testHref={stack.testHref}
                />
              ))}
            </div>
          ) : (
            <Card className="max-w-2xl">
              <CardContent className="py-12 text-center text-muted-foreground">
                {stackCards.length === 0
                  ? t("home.noStacksInGroup")
                  : t("group.noStacksMatchFilter")}
              </CardContent>
            </Card>
          )
        ) : (
          <Card className="max-w-2xl">
            <CardContent className="space-y-3 py-12 text-center text-muted-foreground">
              <p>{t("group.notFoundTitle")}</p>
              <p className="text-sm">{t("group.notFoundDescription")}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
