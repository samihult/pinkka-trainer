"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SpeciesCard } from "@/components/species-card";
import { LearningSessionShell } from "@/components/learning-session-shell";
import { LoadingSpinner } from "@/components/loading-spinner";
import { VerdantScholarIconButton } from "@/components/verdant-scholar/atoms/icon-button";
import { VerdantScholarPopupMenu } from "@/components/verdant-scholar/molecules/popup-menu";
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

/** Builds a stable traversal order for shuffle mode without reordering the visible species list. */
function createShuffleOrder(length: number, currentIndex: number): number[] {
  const indices = Array.from({ length }, (_, index) => index);
  if (length <= 1 || currentIndex < 0 || currentIndex >= length) {
    return indices;
  }

  const remainingIndices = indices.filter((index) => index !== currentIndex);
  remainingIndices.sort(() => Math.random() - 0.5);
  return [currentIndex, ...remainingIndices];
}

/** Learning cards page for traversing a stack without leaving the collection context. */
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(false);
  const [shuffleOrder, setShuffleOrder] = useState<number[]>([]);
  const [shufflePosition, setShufflePosition] = useState(0);
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
      setSpecies(speciesWithImages);
      setIsShuffleEnabled(false);
      setShuffleOrder([]);
      setShufflePosition(0);
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
    if (isShuffleEnabled) {
      setIsShuffleEnabled(false);
      setShuffleOrder([]);
      setShufflePosition(0);
      return;
    }

    setShuffleOrder(createShuffleOrder(species.length, currentIndex));
    setShufflePosition(0);
    setIsShuffleEnabled(true);
  }, [currentIndex, isShuffleEnabled, species.length]);

  const handleNext = useCallback(() => {
    if (species.length <= 1) return;

    if (isShuffleEnabled) {
      const nextPosition =
        shufflePosition >= shuffleOrder.length - 1 ? 0 : shufflePosition + 1;
      const nextIndex = shuffleOrder[nextPosition];
      if (nextIndex === undefined) return;
      setShufflePosition(nextPosition);
      setCurrentIndex(nextIndex);
      return;
    }

    setCurrentIndex(currentIndex >= species.length - 1 ? 0 : currentIndex + 1);
  }, [
    currentIndex,
    isShuffleEnabled,
    shuffleOrder,
    shufflePosition,
    species.length,
  ]);

  const handlePrevious = useCallback(() => {
    if (species.length <= 1) return;

    if (isShuffleEnabled) {
      const previousPosition =
        shufflePosition <= 0 ? shuffleOrder.length - 1 : shufflePosition - 1;
      const previousIndex = shuffleOrder[previousPosition];
      if (previousIndex === undefined) return;
      setShufflePosition(previousPosition);
      setCurrentIndex(previousIndex);
      return;
    }

    setCurrentIndex(currentIndex <= 0 ? species.length - 1 : currentIndex - 1);
  }, [
    currentIndex,
    isShuffleEnabled,
    shuffleOrder,
    shufflePosition,
    species.length,
  ]);

  const handleSelectSpeciesFromProgress = useCallback(
    (index: number) => {
      if (index < 0 || index >= species.length) return;
      setCurrentIndex(index);
      if (!isShuffleEnabled) return;
      const mappedPosition = shuffleOrder.indexOf(index);
      setShufflePosition(mappedPosition >= 0 ? mappedPosition : 0);
    },
    [isShuffleEnabled, shuffleOrder, species.length],
  );

  const handleSelectSpeciesFromMenu = useCallback(
    (index: number) => {
      handleSelectSpeciesFromProgress(index);
    },
    [handleSelectSpeciesFromProgress],
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
        theme="verdant-scholar"
        layout="desktop"
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
  const speciesMenuItems = species.map((item, index) => ({
    id: item.id,
    label: item.data.scientificName,
    description:
      getLocalizedText(item.data.vernacularName, preferredLanguage) ??
      undefined,
    leading: (
      <span className="min-w-8 text-xs font-semibold text-inherit">
        {index + 1}
      </span>
    ),
  }));
  const canNavigate = species.length > 1;

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
            disabled={!canNavigate}
            aria-label={t("learn.cards.previous")}
          >
            <SkipBack className="size-4" />
          </VerdantScholarIconButton>
          <VerdantScholarIconButton
            tone="activeToolbar"
            size="md"
            onClick={handleNext}
            disabled={!canNavigate}
            aria-label={t("learn.cards.next")}
          >
            <SkipForward className="size-4" />
          </VerdantScholarIconButton>
          <VerdantScholarPopupMenu
            items={speciesMenuItems}
            label={progressLabel}
            onSelect={(selectedItem) => {
              const selectedIndex = species.findIndex(
                (item) => item.id === selectedItem.id,
              );
              handleSelectSpeciesFromMenu(selectedIndex);
            }}
            selectedItemId={species[currentIndex]?.id}
            triggerAriaLabel={t("learn.cards.openSpeciesList")}
          />
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
