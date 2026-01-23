"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Flashcard } from "@/components/flashcard";
import { LearningSessionShell } from "@/components/learning-session-shell";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  getGroups,
  getStack,
  getSpecies,
} from "@/lib/firebase/firestore-helpers";
import type { Group, Stack, Species } from "@/lib/types";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";
import { getSpeciesImagesWithUrls } from "@/lib/pinkka/pinkka-display";
import { logFirestoreError } from "@/lib/utils";
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";
import { Shuffle } from "lucide-react";
import Link from "next/link";

export default function FlashcardsPage() {
  const { language } = useLanguagePreference();
  const preferredLanguage = toLanguageCode(language);
  const params = useParams();
  const stackId = params.stackId as string;

  const [stack, setStack] = useState<Stack | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, [stackId]);

  const loadData = async () => {
    try {
      const [stackData, speciesData, groupsData] = await Promise.all([
        getStack(stackId),
        getSpecies(stackId),
        getGroups(),
      ]);
      const speciesWithImages = speciesData.filter(
        (item) => getSpeciesImagesWithUrls(item.data).length > 0,
      );
      const resolvedGroup =
        groupsData.find((item) => item.stackIds?.includes(stackId)) ?? null;
      setStack(stackData);
      setGroup(resolvedGroup);
      setSpecies(speciesWithImages);
    } catch (error) {
      logFirestoreError("Failed to load flashcards data", error);
    } finally {
      setLoading(false);
    }
  };

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
        stackName="Flashcards"
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
        groupName={group ? getLocalizedText(group.data.name, preferredLanguage) : "Study Group"}
        stackName={stack ? getLocalizedText(stack.data.name, preferredLanguage) : "Flashcards"}
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
    : getLocalizedText(stack.data.pinkka?.name, preferredLanguage);

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
      <Flashcard
        species={species[currentIndex]}
        onNext={handleNext}
        onPrevious={handlePrevious}
        currentIndex={currentIndex}
        total={species.length}
      />
    </LearningSessionShell>
  );
}
