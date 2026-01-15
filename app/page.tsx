"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading-spinner";
import { getGroups, getStacks } from "@/lib/firebase/firestore-helpers";
import type { Group, Stack } from "@/lib/types";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";
import { logFirestoreError } from "@/lib/utils";
import { BookOpen, Brain } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [stacksByGroup, setStacksByGroup] = useState<{
    [key: string]: Stack[];
  }>({});
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
    } catch (error) {
      logFirestoreError("Failed to load learn page data", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <Navbar />
        <LoadingSpinner className="py-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Learn Species</h1>
          <p className="text-muted-foreground">
            Choose a stack to study with flashcards or take a quiz
          </p>
        </div>

        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.id}>
              <h2 className="text-2xl font-bold mb-4">
                {getLocalizedText(group.data.name, "fi")}
              </h2>
              {getLocalizedText(group.data.description, "fi") && (
                <p className="text-muted-foreground mb-4">
                  {getLocalizedText(group.data.description, "fi")}
                </p>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(stacksByGroup[group.id] || []).map((stack) => (
                  <Card
                    key={stack.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        {getLocalizedText(stack.data.name, "fi")}
                      </CardTitle>
                      {getLocalizedText(stack.data.description, "fi") && (
                        <CardDescription>
                          {getLocalizedText(stack.data.description, "fi")}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button asChild className="w-full">
                        <Link href={`/learn/flashcards/${stack.id}`}>
                          <BookOpen className="mr-2 h-4 w-4" />
                          Study Flashcards
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="w-full bg-transparent"
                      >
                        <Link href={`/learn/quiz/${stack.id}`}>
                          <Brain className="mr-2 h-4 w-4" />
                          Take Quiz
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {(stacksByGroup[group.id] || []).length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No stacks available in this group yet
                  </CardContent>
                </Card>
              )}
            </div>
          ))}

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
