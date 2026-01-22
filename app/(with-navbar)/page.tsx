"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading-spinner";
import { getGroups, getStacks } from "@/lib/firebase/firestore-helpers";
import type { Group, Stack } from "@/lib/types";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";
import { logFirestoreError } from "@/lib/utils";
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";
import {
  BookOpen,
  Brain,
  ChevronRight,
  RectangleHorizontal,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const { language } = useLanguagePreference();
  const preferredLanguage = toLanguageCode(language);
  const [groups, setGroups] = useState<Group[]>([]);
  const [stacksByGroup, setStacksByGroup] = useState<{
    [key: string]: Stack[];
  }>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const [groupsData, allStacks] = await Promise.all([
        getGroups(),
        getStacks(),
      ]);
      setGroups(groupsData);

      const stackById = new Map(allStacks.map((stack) => [stack.id, stack]));
      const stacksData = groupsData.reduce<{ [key: string]: Stack[] }>(
        (acc, group) => {
          const orderedStacks = (group.stackIds ?? [])
            .map((stackId) => stackById.get(stackId))
            .filter((stack): stack is Stack => Boolean(stack));
          acc[group.id] = orderedStacks;
          return acc;
        },
        {},
      );
      setStacksByGroup(stacksData);
      setExpandedGroups({});
    } catch (error) {
      logFirestoreError("Failed to load learn page data", error);
    } finally {
      setLoading(false);
    }
  };

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
            Choose a stack to study with flashcards or take a quiz
          </p>
        </div>

        <div className="space-y-8">
          {groups.map((group) => {
            const isExpanded = expandedGroups[group.id] ?? false;
            return (
              <div key={group.id}>
                <button
                  type="button"
                  className="flex items-start py-1 gap-2 text-left rounded-sm hover:bg-muted/60 transition"
                  onClick={() =>
                    setExpandedGroups((prev) => ({
                      ...prev,
                      [group.id]: !isExpanded,
                    }))
                  }
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
                  <span className="pt-0.5">
                    <span className="text-2xl font-bold">
                      {getLocalizedText(group.data.name, preferredLanguage)}
                    </span>
                    {getLocalizedText(group.data.description, preferredLanguage) && (
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
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <Button asChild className="sm:w-auto">
                            <Link href={`/learn/flashcards/${stack.id}`}>
                              <RectangleHorizontal className="mr-1 h-4 w-4" />
                              Flashcards
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            className="bg-transparent sm:w-auto"
                          >
                            <Link href={`/learn/quiz/${stack.id}`}>
                              <Brain className="mr-1 h-4 w-4" />
                              Take Quiz
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
