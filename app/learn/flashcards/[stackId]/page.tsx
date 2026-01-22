"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Flashcard } from "@/components/flashcard";
import { LoadingSpinner } from "@/components/loading-spinner";
import { getStack, getSpecies } from "@/lib/firebase/firestore-helpers";
import type { Stack, Species } from "@/lib/types";
import { getLocalizedText } from "@/lib/pinkka/pinkka-api";
import { logFirestoreError } from "@/lib/utils";
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";
import { ArrowLeft, Shuffle } from "lucide-react";
import Link from "next/link";

export default function FlashcardsPage() {
  const { language } = useLanguagePreference();
  const preferredLanguage = toLanguageCode(language);
  const params = useParams();
  const stackId = params.stackId as string;

  const [stack, setStack] = useState<Stack | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, [stackId]);

  const loadData = async () => {
    try {
      const [stackData, speciesData] = await Promise.all([
        getStack(stackId),
        getSpecies(stackId),
      ]);
      setStack(stackData);
      setSpecies(speciesData);
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
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <LoadingSpinner className="py-12" />
      </div>
    );
  }

  if (!stack || species.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <main className="container mx-auto px-4 py-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Learning
            </Link>
          </Button>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No species available in this stack
            </p>
            <Button asChild>
              <Link href="/">Browse Other Stacks</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Learning
            </Link>
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {getLocalizedText(stack.data.name, preferredLanguage)}
              </h1>
            </div>

            <Button onClick={handleShuffle} variant="outline">
              <Shuffle className="mr-2 h-4 w-4" />
              Shuffle
            </Button>
          </div>
        </div>

        <Flashcard
          species={species[currentIndex]}
          onNext={handleNext}
          onPrevious={handlePrevious}
          currentIndex={currentIndex}
          total={species.length}
        />
      </main>
    </div>
  );
}
