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
import {
  fetchPinkkaGroups,
  fetchPinkkaGroupWithStacks,
  getLocalizedText,
  type PinkkaGroup,
  type PinkkaSubStack,
} from "@/lib/pinkka/pinkka-api";
import { BookOpen, Brain, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function PinkkaPage() {
  const [groups, setGroups] = useState<PinkkaGroup[]>([]);
  const [subStacksByGroup, setSubStacksByGroup] = useState<{
    [key: number]: PinkkaSubStack[];
  }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"fi" | "en" | "sv">("fi");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const groupsData = await fetchPinkkaGroups();

      if (groupsData.length === 0) {
        setError("No groups found from Pinkka API");
        return;
      }

      setGroups(groupsData);

      const subStacksData: { [key: number]: PinkkaSubStack[] } = {};
      for (const group of groupsData) {
        const groupDetail = await fetchPinkkaGroupWithStacks(group.id);
        if (groupDetail?.subPinkkas) {
          subStacksData[group.id] = groupDetail.subPinkkas.sort(
            (a, b) => a.orderNo - b.orderNo,
          );
        }
      }
      setSubStacksByGroup(subStacksData);
    } catch (err) {
      console.error("Failed to load Pinkka data:", err);
      setError("Failed to load data from Pinkka API. Please try again later.");
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
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Pinkka Content</h1>
            <p className="text-muted-foreground">
              Browse species collections from pinkka.laji.fi
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-1 border rounded-md p-1">
              {(["fi", "en", "sv"] as const).map((lang) => (
                <Button
                  key={lang}
                  variant={language === lang ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setLanguage(lang)}
                  className="text-xs"
                >
                  {lang.toUpperCase()}
                </Button>
              ))}
            </div>
            <Button asChild variant="outline">
              <a
                href="https://pinkka.laji.fi"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Visit pinkka.laji.fi
              </a>
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="py-6">
              <p className="text-destructive">{error}</p>
              <Button
                onClick={loadData}
                className="mt-4 bg-transparent"
                variant="outline"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-8">
          {groups.map((group) => {
            const groupName = getLocalizedText(group.name, language);
            const groupDesc = getLocalizedText(group.description, language);
            const subStacks = subStacksByGroup[group.id] || [];

            return (
              <div key={group.id}>
                <h2 className="text-2xl font-bold mb-4">
                  {groupName || `Group ${group.id}`}
                </h2>
                {groupDesc && (
                  <p className="text-muted-foreground mb-4">{groupDesc}</p>
                )}

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subStacks.map((subStack) => {
                    const subStackName = getLocalizedText(
                      subStack.name,
                      language,
                    );
                    const subStackDesc = getLocalizedText(
                      subStack.description,
                      language,
                    );
                    const speciesCount = subStack.speciesCards?.length || 0;

                    return (
                      <Card
                        key={subStack.id}
                        className="hover:shadow-lg transition-shadow"
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-balance">
                            <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
                            <span>
                              {subStackName || `Stack ${subStack.id}`}
                            </span>
                          </CardTitle>
                          {subStackDesc && (
                            <CardDescription className="text-pretty">
                              {subStackDesc}
                            </CardDescription>
                          )}
                          {speciesCount > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {speciesCount} species
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <Button asChild className="w-full">
                            <Link href={`/pinkka/flashcards/${subStack.id}`}>
                              <BookOpen className="mr-2 h-4 w-4" />
                              Study Flashcards
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            className="w-full bg-transparent"
                          >
                            <Link href={`/pinkka/quiz/${subStack.id}`}>
                              <Brain className="mr-2 h-4 w-4" />
                              Take Quiz
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {subStacks.length === 0 && (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No stacks available in this group
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}

          {groups.length === 0 && !error && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">No content available from Pinkka API</p>
                <p className="text-sm">
                  The external API may be temporarily unavailable
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
