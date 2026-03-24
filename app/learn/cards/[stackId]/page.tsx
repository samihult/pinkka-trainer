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
import { SegmentedLearningProgress } from "@/components/learning/segmented-learning-progress";
import { VerdantScholarButton } from "@/components/verdant-scholar/atoms/button";
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

const LEGACY_BACKSIDE_PANEL_QUERY_PARAM = "back";
const LEARNING_INFO_PANEL_QUERY_PARAM = "learningPanel";

function parseInfoPanelVisibility(value: string | null): boolean {
  if (value === null) return true;
  return value === "1" || value === "true" || value === "open";
}

export default function CardsPage() {
  const { language } = useLanguagePreference();
  const { t } = useI18n();
  const preferredLanguage = toLanguageCode(language);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const stackId = decodeURIComponent(params.stackId as string);
  const requestedGroupId = searchParams.get("groupId");
  const { user, loading: authLoading } = useAuth();

  const [stack, setStack] = useState<Stack | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const isInfoPanelOpen = useMemo(
    () =>
      parseInfoPanelVisibility(
        searchParams.get(LEARNING_INFO_PANEL_QUERY_PARAM) ??
          searchParams.get(LEGACY_BACKSIDE_PANEL_QUERY_PARAM),
      ),
    [searchParams],
  );

  const updateInfoPanelVisibility = useCallback(
    (nextOpen: boolean) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set(LEARNING_INFO_PANEL_QUERY_PARAM, nextOpen ? "1" : "0");
      nextParams.delete(LEGACY_BACKSIDE_PANEL_QUERY_PARAM);
      const nextQuery = nextParams.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const toggleInfoPanel = useCallback(() => {
    updateInfoPanelVisibility(!isInfoPanelOpen);
  }, [isInfoPanelOpen, updateInfoPanelVisibility]);

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
      consoleRight={
        <div className="flex items-center gap-2">
          <VerdantScholarButton
            variant={isInfoPanelOpen ? "secondary" : "primary"}
            size="sm"
            onClick={toggleInfoPanel}
          >
            {isInfoPanelOpen
              ? t("learn.cards.info.hide")
              : t("learn.cards.info.show")}
          </VerdantScholarButton>
          <VerdantScholarIconButton
            tone="toolbar"
            size="md"
            onClick={handleShuffle}
            aria-label={t("learn.cards.shuffle")}
          >
            <Shuffle className="size-4" />
          </VerdantScholarIconButton>
        </div>
      }
    >
      <SpeciesCard
        species={species[currentIndex]}
        onNext={handleNext}
        onPrevious={handlePrevious}
        currentIndex={currentIndex}
        total={species.length}
        isInfoPanelOpen={isInfoPanelOpen}
        onToggleInfoPanel={toggleInfoPanel}
        showBottomControls={false}
      />
    </LearningSessionShell>
  );
}
