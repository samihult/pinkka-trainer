"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  getGroups,
  getStackLearningHistograms,
  getStacks,
} from "@/lib/firebase/firestore-helpers";
import type { Group, Stack, StackLearningHistogram } from "@/lib/types";
import { getLocalizedText } from "@/lib/content/content-display";
import { logFirestoreError } from "@/lib/utils";
import { useLanguagePreference } from "@/lib/language-context";
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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { StackLearningHistogram as StackLearningHistogramBars } from "@/components/learning/stack-learning-histogram";

/** Home page client component for selecting groups and stacks to learn. */
export function HomePageClient() {
  const { language } = useLanguagePreference();
  const preferredLanguage = toLanguageCode(language);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [allStacks, setAllStacks] = useState<Stack[]>([]);
  const [stacksByGroup, setStacksByGroup] = useState<{
    [key: string]: Stack[];
  }>({});
  const [stackHistograms, setStackHistograms] = useState<
    Map<string, StackLearningHistogram>
  >(new Map());
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const expandedGroupFromQuery = useMemo(() => {
    const value = searchParams.get("g");
    return value && value.length > 0 ? value : null;
  }, [searchParams]);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (expandedGroupFromQuery) {
      setExpandedGroupId(expandedGroupFromQuery);
      setStoredHomeExpandedGroupId(expandedGroupFromQuery);
      return;
    }

    setExpandedGroupId(getStoredHomeExpandedGroupId());
  }, [expandedGroupFromQuery]);

  const loadData = async () => {
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
  };

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
          <h1 className="text-3xl font-bold mb-2">Learn Species</h1>
          <p className="text-muted-foreground">
            Choose a stack to study with cards or take a test
          </p>
        </div>

        <div className="space-y-8">
          {groups.map((group) => {
            const isExpanded = expandedGroupId === group.id;
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
                    <span className="text-2xl font-bold">
                      {getLocalizedText(group.data.name, preferredLanguage)}
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
                    {(stacksByGroup[group.id] || []).map((stack) => (
                      <div
                        key={stack.id}
                        className="rounded-lg border border-border bg-card px-4 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <h3 className="text-base font-semibold">
                            {getLocalizedText(
                              stack.data.name,
                              preferredLanguage,
                            )}
                          </h3>
                        </div>
                        {getLocalizedText(
                          stack.data.description,
                          preferredLanguage,
                        ) && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {getLocalizedText(
                              stack.data.description,
                              preferredLanguage,
                            )}
                          </p>
                        )}
                        {user && (
                          <div className="mt-3 mb-4">
                            {stackHistograms.get(stack.id) ? (
                              <StackLearningHistogramBars
                                scientific={
                                  stackHistograms.get(stack.id)!.scientific
                                }
                                vernacular={
                                  stackHistograms.get(stack.id)!.vernacular
                                }
                              />
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                No learning data yet
                              </p>
                            )}
                          </div>
                        )}
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <Button asChild className="sm:w-auto">
                            <Link href={`/learn/cards/${stack.id}`}>
                              <RectangleHorizontal className="mr-1 h-4 w-4" />
                              Learning Mode
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            className="bg-transparent sm:w-auto"
                          >
                            <Link href={`/learn/tests/${stack.id}`}>
                              <Brain className="mr-1 h-4 w-4" />
                              Take Test
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}

                    {(stacksByGroup[group.id] || []).length === 0 && (
                      <Card>
                        <CardContent className="py-6 text-center text-muted-foreground">
                          No stacks available in this group yet
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
                <p className="mb-4">No learning materials available yet</p>
                <p className="text-sm">
                  Check back later or contact an editor to add content
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
