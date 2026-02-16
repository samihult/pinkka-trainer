"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  getSpecies,
  getGroups,
  getStackLearningHistograms,
  getStacks,
} from "@/lib/firebase/firestore-helpers";
import type {
  Group,
  Species,
  Stack,
  StackLearningHistogram,
} from "@/lib/types";
import {
  getLocalizedText,
  getSpeciesImageUrl,
} from "@/lib/content/content-display";
import { logFirestoreError } from "@/lib/utils";
import { useLanguagePreference } from "@/lib/language-context";
import { useI18n } from "@/lib/i18n";
import {
  getStoredHomeExpandedGroupId,
  setStoredHomeExpandedGroupId,
  toLanguageCode,
} from "@/lib/local-preferences";
import { useAuth } from "@/lib/auth-context";
import {
  BookOpen,
  Brain,
  ChevronRight,
  RectangleHorizontal,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { StackLearningHistogram as StackLearningHistogramBars } from "@/components/learning/stack-learning-histogram";

/** Home page client component for selecting groups and stacks to learn. */
export function HomePageClient() {
  const { language } = useLanguagePreference();
  const { t } = useI18n();
  const preferredLanguage = toLanguageCode(language);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [allStacks, setAllStacks] = useState<Stack[]>([]);
  const [stacksByGroup, setStacksByGroup] = useState<{
    [key: string]: Stack[];
  }>({});
  const [stackHistograms, setStackHistograms] = useState<
    Map<string, StackLearningHistogram>
  >(new Map());
  const [stackSpeciesPreviewUrls, setStackSpeciesPreviewUrls] = useState<
    Map<string, string>
  >(new Map());
  const [stackSpeciesCounts, setStackSpeciesCounts] = useState<
    Map<string, number>
  >(new Map());
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getStackImageUrl = useCallback((stack: Stack): string | null => {
    const stackImages = [...(stack.data.images ?? []), ...(stack.images ?? [])];
    for (const image of stackImages) {
      const url = getSpeciesImageUrl(image, { preferThumbnail: true });
      if (url) return url;
    }
    return null;
  }, []);

  const getFirstSpeciesImageUrl = useCallback((species: Species[]): string => {
    for (const item of species) {
      const imageWithUrl =
        item.data.images?.find((image) =>
          Boolean(getSpeciesImageUrl(image, { preferThumbnail: true })),
        ) ?? null;
      if (!imageWithUrl) continue;
      const imageUrl = getSpeciesImageUrl(imageWithUrl, {
        preferThumbnail: true,
      });
      if (imageUrl) return imageUrl;
    }
    return "";
  }, []);

  const expandedGroupFromQuery = useMemo(() => {
    const value = searchParams.get("g");
    return value && value.length > 0 ? value : null;
  }, [searchParams]);

  useEffect(() => {
    if (expandedGroupFromQuery) {
      setExpandedGroupId(expandedGroupFromQuery);
      setStoredHomeExpandedGroupId(expandedGroupFromQuery);
      return;
    }

    setExpandedGroupId(getStoredHomeExpandedGroupId());
  }, [expandedGroupFromQuery]);

  const loadData = useCallback(async () => {
    try {
      const [groupsData, allStacks] = await Promise.all([
        getGroups(),
        getStacks(),
      ]);
      setGroups(groupsData);
      setAllStacks(allStacks);

      const stacksData = groupsData.reduce<{ [key: string]: Stack[] }>(
        (acc, group) => {
          const legacyStackIds = new Set(group.stackIds ?? []);
          const orderedStacks = [...allStacks]
            .filter(
              (stack) =>
                stack.parentGroupId === group.id ||
                (stack.parentGroupId === undefined &&
                  legacyStackIds.has(stack.id)),
            )
            .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
          acc[group.id] = orderedStacks;
          return acc;
        },
        {},
      );
      setStacksByGroup(stacksData);
    } catch (error) {
      logFirestoreError("Failed to load learn page data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    void loadData();
  }, [authLoading, loadData, user]);

  useEffect(() => {
    if (!user || allStacks.length === 0) {
      setStackHistograms(new Map());
      return;
    }

    const loadHistograms = async () => {
      try {
        const histogramMap = await getStackLearningHistograms(
          user.uid,
          allStacks.map((stack) => stack.id),
        );
        setStackHistograms(histogramMap);
      } catch (error) {
        logFirestoreError("Failed to load learning histograms", error);
      }
    };

    void loadHistograms();
  }, [allStacks, user]);

  useEffect(() => {
    if (allStacks.length === 0) {
      setStackSpeciesPreviewUrls(new Map());
      setStackSpeciesCounts(new Map());
      return;
    }

    let isCancelled = false;

    const loadStackSpeciesMetadata = async () => {
      const stacksNeedingFallback = new Set(
        allStacks
          .filter((stack) => !getStackImageUrl(stack))
          .map((stack) => stack.id),
      );
      const speciesByStack = await Promise.allSettled(
        allStacks.map(async (stack) => {
          const stackSpecies = await getSpecies(stack.id);
          return [stack.id, stackSpecies] as const;
        }),
      );

      if (isCancelled) return;

      const nextCountsMap = new Map<string, number>();
      const nextPreviewMap = new Map<string, string>();
      speciesByStack.forEach((entry) => {
        if (entry.status !== "fulfilled") return;
        const [stackId, stackSpecies] = entry.value;
        nextCountsMap.set(stackId, stackSpecies.length);

        if (!stacksNeedingFallback.has(stackId)) return;

        const previewUrl = getFirstSpeciesImageUrl(stackSpecies);
        if (previewUrl) {
          nextPreviewMap.set(stackId, previewUrl);
        }
      });

      setStackSpeciesCounts(nextCountsMap);
      setStackSpeciesPreviewUrls(nextPreviewMap);
    };

    void loadStackSpeciesMetadata();
    return () => {
      isCancelled = true;
    };
  }, [allStacks, getFirstSpeciesImageUrl, getStackImageUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <LoadingSpinner className="py-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t("home.title")}</h1>
          <p className="text-muted-foreground">{t("home.subtitle")}</p>
        </div>

        <div className="space-y-8">
          {groups.map((group) => {
            const isExpanded = expandedGroupId === group.id;
            const groupStacks = stacksByGroup[group.id] || [];
            const groupSpeciesCount = groupStacks.reduce(
              (total, stack) =>
                total +
                (stackSpeciesCounts.get(stack.id) ??
                  stack.speciesIds?.length ??
                  0),
              0,
            );
            return (
              <div key={group.id}>
                <button
                  type="button"
                  className="flex items-start pt-1 pr-5 pb-2 gap-2 text-left rounded-sm hover:bg-muted/60 transition"
                  onClick={() => {
                    const nextExpandedId = isExpanded ? null : group.id;
                    const params = new URLSearchParams(searchParams.toString());

                    if (nextExpandedId) {
                      params.set("g", nextExpandedId);
                    } else {
                      params.delete("g");
                    }

                    setExpandedGroupId(nextExpandedId);
                    setStoredHomeExpandedGroupId(nextExpandedId);
                    const nextQuery = params.toString();
                    router.replace(
                      nextQuery ? `${pathname}?${nextQuery}` : pathname,
                      { scroll: false },
                    );
                  }}
                  aria-expanded={isExpanded}
                  aria-controls={`group-${group.id}-stacks`}
                >
                  <span className="mt-1 inline-flex h-8 w-8 items-center justify-center text-muted-foreground">
                    <ChevronRight
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isExpanded ? "rotate-90" : "rotate-0"
                      }`}
                    />
                  </span>
                  <span className="pt-1">
                    <span className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {getLocalizedText(group.data.name, preferredLanguage)}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {t("home.speciesCount", { count: groupSpeciesCount })}
                      </span>
                    </span>
                    {getLocalizedText(
                      group.data.description,
                      preferredLanguage,
                    ) && (
                      <span className="text-muted-foreground mt-1 block">
                        {getLocalizedText(
                          group.data.description,
                          preferredLanguage,
                        )}
                      </span>
                    )}
                  </span>
                </button>

                {isExpanded && (
                  <div
                    id={`group-${group.id}-stacks`}
                    className="mt-4 space-y-4 pl-10"
                  >
                    {groupStacks.map((stack) => {
                      const stackName = getLocalizedText(
                        stack.data.name,
                        preferredLanguage,
                      );
                      const stackDescription = getLocalizedText(
                        stack.data.description,
                        preferredLanguage,
                      );
                      const previewImageUrl =
                        getStackImageUrl(stack) ??
                        stackSpeciesPreviewUrls.get(stack.id) ??
                        null;
                      const stackSpeciesCount = stackSpeciesCounts.get(
                        stack.id,
                      );

                      return (
                        <div
                          key={stack.id}
                          className="w-full max-w-3xl rounded-lg border border-border bg-card px-4 py-3 sm:max-w-3xl lg:max-w-3xl xl:max-w-3xl"
                        >
                          <div className="flex h-full flex-col gap-4 lg:flex-row sm:items-stretch sm:gap-5">
                            <div className="flex flex-grow-1 gap-4 flex-col sm:flex-row sm:items-stretch sm:gap-5">
                              <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-md bg-muted sm:h-auto sm:min-h-28 sm:w-36">
                                {previewImageUrl ? (
                                  <Image
                                    src={previewImageUrl}
                                    alt={stackName}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 100vw, 144px"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                    <BookOpen className="h-6 w-6" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-4 w-4 text-primary" />
                                  <h3 className="text-base font-semibold">
                                    {stackName}
                                  </h3>
                                  {typeof stackSpeciesCount === "number" && (
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                      {t("home.speciesCount", {
                                        count: stackSpeciesCount,
                                      })}
                                    </span>
                                  )}
                                </div>
                                {stackDescription && (
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {stackDescription}
                                  </p>
                                )}
                                {user && (
                                  <div className="mt-3">
                                    {stackHistograms.get(stack.id) ? (
                                      <StackLearningHistogramBars
                                        scientific={
                                          stackHistograms.get(stack.id)!
                                            .scientific
                                        }
                                        vernacular={
                                          stackHistograms.get(stack.id)!
                                            .vernacular
                                        }
                                        either={
                                          stackHistograms.get(stack.id)!.either
                                        }
                                      />
                                    ) : (
                                      <p className="text-xs text-muted-foreground">
                                        {t("home.noLearningDataYet")}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-40">
                              <Button
                                asChild
                                className="flex-grow-1 sm:max-w-50"
                              >
                                <Link href={`/learn/cards/${stack.id}`}>
                                  <RectangleHorizontal className="mr-1 h-4 w-4" />
                                  {t("home.learn")}
                                </Link>
                              </Button>
                              <Button
                                asChild
                                variant="outline"
                                className="flex-grow-1 bg-transparent sm:max-w-50"
                              >
                                <Link href={`/learn/tests/${stack.id}`}>
                                  <Brain className="mr-1 h-4 w-4" />
                                  {t("home.takeTest")}
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {groupStacks.length === 0 && (
                      <Card>
                        <CardContent className="py-6 text-center text-muted-foreground">
                          {t("home.noStacksInGroup")}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {groups.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">{t("home.noMaterialsTitle")}</p>
                <p className="text-sm">{t("home.noMaterialsSubtitle")}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
