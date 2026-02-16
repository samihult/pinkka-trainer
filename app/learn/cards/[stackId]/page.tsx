"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { Button } from "@/components/ui/button";
import { SpeciesCard } from "@/components/species-card";
import { LearningSessionShell } from "@/components/learning-session-shell";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  getGroup,
  getGroups,
  getStack,
  getSpecies,
} from "@/lib/firebase/firestore-helpers";
import { useAuth } from "@/lib/auth-context";
import type { Group, Stack, Species } from "@/lib/types";
import {
  getLocalizedText,
  getSpeciesImagesWithUrls,
} from "@/lib/content/content-display";
import { logFirestoreError } from "@/lib/utils";
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";
import { Shuffle } from "lucide-react";
import Link from "next/link";

const LEGACY_BACKSIDE_PANEL_QUERY_PARAM = "back";
const LEARNING_PANEL_QUERY_PARAM = "learningPanel";

function parseBacksidePanelVisibility(value: string | null): boolean {
  return value === "1" || value === "true" || value === "open";
}

export default function CardsPage() {
  const { language } = useLanguagePreference();
  const preferredLanguage = toLanguageCode(language);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const stackId = decodeURIComponent(params.stackId as string);
  const { user, loading: authLoading } = useAuth();

  const [stack, setStack] = useState<Stack | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const isBacksidePanelOpen = useMemo(
    () =>
      parseBacksidePanelVisibility(
        searchParams.get(LEARNING_PANEL_QUERY_PARAM) ??
          searchParams.get(LEGACY_BACKSIDE_PANEL_QUERY_PARAM),
      ),
    [searchParams],
  );

  const updateBacksidePanelVisibility = useCallback(
    (nextOpen: boolean) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set(LEARNING_PANEL_QUERY_PARAM, nextOpen ? "1" : "0");
      nextParams.delete(LEGACY_BACKSIDE_PANEL_QUERY_PARAM);
      const nextQuery = nextParams.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const toggleBacksidePanel = useCallback(() => {
    updateBacksidePanelVisibility(!isBacksidePanelOpen);
  }, [isBacksidePanelOpen, updateBacksidePanelVisibility]);

  const loadData = useCallback(async () => {
    try {
      const stackData = await getStack(stackId);
      const [speciesData, directGroupData, allGroups] = await Promise.all([
        getSpecies(stackId),
        stackData?.parentGroupId
          ? getGroup(stackData.parentGroupId)
          : Promise.resolve(null),
        stackData?.parentGroupId ? Promise.resolve([]) : getGroups(),
      ]);
      const legacyGroupData =
        directGroupData ??
        allGroups.find((candidate) => candidate.stackIds?.includes(stackId)) ??
        null;
      const speciesWithImages = speciesData.filter(
        (item) => getSpeciesImagesWithUrls(item.data).length > 0,
      );
      setStack(stackData);
      setGroup(legacyGroupData);
      setSpecies(speciesWithImages);
    } catch (error) {
      logFirestoreError("Failed to load cards data", error);
    } finally {
      setLoading(false);
    }
  }, [stackId]);

  useEffect(() => {
    if (authLoading || !user) return;
    void loadData();
  }, [authLoading, loadData, user]);

  const handleShuffle = () => {
    const shuffled = [...species].sort(() => Math.random() - 0.5);
    setSpecies(shuffled);
    setCurrentIndex(0);
  };

  const handleNext = () => {
    if (currentIndex < species.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) {
    return (
      <LearningSessionShell
        groupName="Loading"
        stackName="Learn"
        progressValue={0}
        exitHref="/"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </LearningSessionShell>
    );
  }

  if (!stack || species.length === 0) {
    return (
      <LearningSessionShell
        groupName={
          group
            ? getLocalizedText(group.data.name, preferredLanguage)
            : "Study Group"
        }
        stackName={
          stack ? getLocalizedText(stack.data.name, preferredLanguage) : "Learn"
        }
        progressValue={0}
        exitHref="/"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-muted-foreground">
            No species with images available in this stack.
          </p>
          <Button asChild>
            <Link href="/">Browse Other Stacks</Link>
          </Button>
        </div>
      </LearningSessionShell>
    );
  }

  const progressValue = ((currentIndex + 1) / species.length) * 100;
  const groupName = group
    ? getLocalizedText(group.data.name, preferredLanguage)
    : "";

  return (
    <LearningSessionShell
      groupName={groupName}
      stackName={getLocalizedText(stack.data.name, preferredLanguage)}
      progressValue={progressValue}
      progressLabel={`Card ${currentIndex + 1} of ${species.length}`}
      exitHref="/"
      headerAction={
        <Button onClick={handleShuffle} variant="outline" size="sm">
          <Shuffle className="mr-1 h-4 w-4" />
          Shuffle
        </Button>
      }
    >
      <SpeciesCard
        species={species[currentIndex]}
        onNext={handleNext}
        onPrevious={handlePrevious}
        currentIndex={currentIndex}
        total={species.length}
        isBacksidePanelOpen={isBacksidePanelOpen}
        onToggleBacksidePanel={toggleBacksidePanel}
      />
    </LearningSessionShell>
  );
}
