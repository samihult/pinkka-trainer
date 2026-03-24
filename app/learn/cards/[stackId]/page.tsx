"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SpeciesCard } from "@/components/species-card";
import { LearningSessionShell } from "@/components/learning-session-shell";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SegmentedLearningProgress } from "@/components/learning/segmented-learning-progress";
import { VerdantScholarIconButton } from "@/components/verdant-scholar/atoms/icon-button";
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
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, Shuffle, SkipBack, SkipForward } from "lucide-react";
import Link from "next/link";

function shuffleSpeciesList(
  items: Species[],
  currentSpeciesId?: string,
  targetIndex = 0,
): Species[] {
  const speciesPool = [...items];
  if (!currentSpeciesId) {
    return speciesPool.sort(() => Math.random() - 0.5);
  }

  const currentIndex = speciesPool.findIndex(
    (item) => item.id === currentSpeciesId,
  );
  if (currentIndex < 0) {
    return speciesPool.sort(() => Math.random() - 0.5);
  }

  const [currentSpecies] = speciesPool.splice(currentIndex, 1);
  const shuffledPool = speciesPool.sort(() => Math.random() - 0.5);
  const insertIndex = Math.max(0, Math.min(targetIndex, shuffledPool.length));
  shuffledPool.splice(insertIndex, 0, currentSpecies);
  return shuffledPool;
}

export default function CardsPage() {
  const { language } = useLanguagePreference();
  const { t } = useI18n();
  const preferredLanguage = toLanguageCode(language);
  const params = useParams();
  const stackId = decodeURIComponent(params.stackId as string);
  const searchParams = useSearchParams();
  const requestedGroupId = searchParams.get("groupId");
  const { user, loading: authLoading } = useAuth();

  const [stack, setStack] = useState<Stack | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);
  const [baseSpecies, setBaseSpecies] = useState<Species[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
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
      setBaseSpecies(speciesWithImages);
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

  const handleShuffleToggle = useCallback(() => {
    const currentSpeciesId = species[currentIndex]?.id;
    if (isShuffleEnabled) {
      setSpecies(baseSpecies);
      setIsShuffleEnabled(false);
      if (currentSpeciesId) {
        const nextIndex = baseSpecies.findIndex(
          (item) => item.id === currentSpeciesId,
        );
        setCurrentIndex(nextIndex >= 0 ? nextIndex : 0);
      } else {
        setCurrentIndex(0);
      }
      return;
    }

    const shuffled = shuffleSpeciesList(
      species,
      currentSpeciesId,
      currentIndex,
    );
    setSpecies(shuffled);
    setIsShuffleEnabled(true);
  }, [baseSpecies, currentIndex, isShuffleEnabled, species]);

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

  const handleSelectSpeciesFromProgress = useCallback(
    (index: number) => {
      if (index < 0 || index >= species.length) return;
      setCurrentIndex(index);
    },
    [species.length],
  );

  const exitGroupId = group?.id ?? requestedGroupId;
  const exitHref = exitGroupId ? `/groups/${exitGroupId}` : "/";
  const stackName = stack
    ? getLocalizedText(stack.data.name, preferredLanguage)
    : "Learn";

  if (loading) {
    return (
      <LearningSessionShell
        groupName="Loading"
        stackName="Learn"
        progressValue={0}
        exitHref={exitHref}
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
        stackName={stackName}
        progressValue={0}
        exitHref={exitHref}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-muted-foreground">
            {t("learn.cards.noSpeciesWithImages")}
          </p>
          <Button asChild>
            <Link href={exitHref}>{t("learn.cards.browseOtherStacks")}</Link>
          </Button>
        </div>
      </LearningSessionShell>
    );
  }

  const progressValue = ((currentIndex + 1) / species.length) * 100;
  const groupName = group
    ? getLocalizedText(group.data.name, preferredLanguage)
    : "";
  const progressLabel = t("learn.cards.progressLabel", {
    current: currentIndex + 1,
    total: species.length,
  });
  const progressSegments = species.map((item) => ({
    id: item.id,
    scientificName: item.data.scientificName,
    vernacularName:
      getLocalizedText(item.data.vernacularName, preferredLanguage) ?? null,
  }));

  return (
    <LearningSessionShell
      theme="verdant-scholar"
      layout="desktop-console"
      groupName={groupName}
      stackName={stackName}
      progressValue={progressValue}
      exitHref={exitHref}
      consoleLeft={
        <div className="flex min-w-0 items-center gap-3">
          <Link href={exitHref} aria-label={t("group.backToHome")}>
            <VerdantScholarIconButton tone="surface" size="lg">
              <ArrowLeft className="size-5" />
            </VerdantScholarIconButton>
          </Link>
          <div className="min-w-0">
            {groupName ? (
              <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-[var(--vs-color-on-surface-variant)]">
                {groupName}
              </p>
            ) : null}
            <p className="truncate text-base font-semibold [font-family:var(--vs-font-display-family)] text-[var(--vs-color-on-surface)]">
              {stackName}
            </p>
          </div>
        </div>
      }
      consoleCenter={
        <div className="mx-auto w-full flex items-center justify-center gap-2">
          <p className="mt-1 text-center text-xs font-medium text-[var(--vs-color-on-surface-variant)]">
            {progressLabel}
          </p>
          <VerdantScholarIconButton
            tone={isShuffleEnabled ? "primaryFixedDim" : "toolbar"}
            size="md"
            onClick={handleShuffleToggle}
            aria-label={t("learn.cards.shuffle")}
            aria-pressed={isShuffleEnabled}
          >
            <Shuffle className="size-4" />
          </VerdantScholarIconButton>
          <VerdantScholarIconButton
            tone="toolbar"
            size="md"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            aria-label={t("learn.cards.previous")}
          >
            <SkipBack className="size-4" />
          </VerdantScholarIconButton>
          <VerdantScholarIconButton
            tone="activeToolbar"
            size="md"
            onClick={handleNext}
            disabled={currentIndex === species.length - 1}
            aria-label={t("learn.cards.next")}
          >
            <SkipForward className="size-4" />
          </VerdantScholarIconButton>
        </div>
      }
      consoleRight={<div className="flex items-center gap-2" />}
    >
      <SpeciesCard
        species={species[currentIndex]}
        onNext={handleNext}
        onPrevious={handlePrevious}
        currentIndex={currentIndex}
        total={species.length}
      />
    </LearningSessionShell>
  );
}
