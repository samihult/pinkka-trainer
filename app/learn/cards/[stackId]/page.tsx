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
import { useI18n } from "@/lib/i18n";
import { Shuffle } from "lucide-react";
import Link from "next/link";

const LEGACY_BACKSIDE_PANEL_QUERY_PARAM = "back";
const LEARNING_INFO_PANEL_QUERY_PARAM = "learningPanel";

function parseInfoPanelVisibility(value: string | null): boolean {
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
        stackName={
          stack ? getLocalizedText(stack.data.name, preferredLanguage) : "Learn"
        }
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
  const progressSegments = species.map((item) => ({
    id: item.id,
    scientificName: item.data.scientificName,
    vernacularName:
      getLocalizedText(item.data.vernacularName, preferredLanguage) ?? null,
  }));

  return (
    <LearningSessionShell
      groupName={groupName}
      stackName={getLocalizedText(stack.data.name, preferredLanguage)}
      progressValue={progressValue}
      progressSegments={progressSegments}
      activeProgressSegmentIndex={currentIndex}
      showProgressSegmentNameOverlay={isInfoPanelOpen}
      onSelectProgressSegment={handleSelectSpeciesFromProgress}
      progressLabel={t("learn.cards.progressLabel", {
        current: currentIndex + 1,
        total: species.length,
      })}
      exitHref={exitHref}
      headerAction={
        <Button onClick={handleShuffle} variant="outline" size="sm">
          <Shuffle className="mr-1 h-4 w-4" />
          {t("learn.cards.shuffle")}
        </Button>
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
      />
    </LearningSessionShell>
  );
}
