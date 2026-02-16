"use client";

import { useEffect, useMemo, useState } from "react";
import sanitizeHtml from "sanitize-html";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Species } from "@/lib/types";
import {
  getLocalizedText,
  getSpeciesDescription,
} from "@/lib/content/content-display";
import { ChevronLeft, ChevronRight, Keyboard, RotateCw } from "lucide-react";
import { SpeciesImageCarousel } from "@/components/species-image-carousel";
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";

/** Props for the flashcard viewer. */
interface FlashcardProps {
  /** Species displayed on the card. */
  species: Species;
  /** Advance to the next card. */
  onNext: () => void;
  /** Navigate to the previous card. */
  onPrevious: () => void;
  /** Zero-based index of the current card. */
  currentIndex: number;
  /** Total number of cards in the session. */
  total: number;
}

/** Interactive flashcard with flip and image navigation controls. */
export function Flashcard({
  species,
  onNext,
  onPrevious,
  currentIndex,
  total,
}: FlashcardProps) {
  const { language } = useLanguagePreference();
  const preferredLanguage = toLanguageCode(language);
  const [flipped, setFlipped] = useState(false);
  const [keyboardTooltipOpen, setKeyboardTooltipOpen] = useState(false);

  const handleFlip = () => setFlipped(!flipped);

  const handleNext = () => {
    setFlipped(false);
    onNext();
  };

  const handlePrevious = () => {
    setFlipped(false);
    onPrevious();
  };

  const images = species.data.images ?? [];
  const vernacularName = getLocalizedText(
    species.data.vernacularName,
    preferredLanguage,
  );
  const description = getSpeciesDescription(species.data, preferredLanguage);
  const sanitizedDescription = useMemo(
    () => (description ? sanitizeHtml(description) : ""),
    [description],
  );

  const shortcutContent = useMemo(
    () => [
      { label: "Flip card", keys: ["Space"] },
      { label: "Open larger / zoom in", keys: ["↑"] },
      { label: "Zoom out / close at fit", keys: ["↓"] },
      { label: "Previous image", keys: ["←"] },
      { label: "Next image", keys: ["→"] },
      { label: "Previous card", keys: ["⌘/Ctrl", "←"] },
      { label: "Next card", keys: ["⌘/Ctrl", "→"] },
    ],
    [],
  );

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        target.isContentEditable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT"
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        handleFlip();
        return;
      }

      if (event.metaKey || event.ctrlKey) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          handlePrevious();
          return;
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip, handleNext, handlePrevious]);

  return (
    <div className="relative h-full w-full">
      <Card className="absolute inset-x-4 top-0 bottom-24 overflow-hidden p-0 sm:inset-x-8">
        <CardContent className="h-full p-0">
          <div
            className={`h-full transition-all duration-500 ${
              flipped ? "opacity-0" : "opacity-100"
            }`}
          >
            {/* Front - Image */}
            <SpeciesImageCarousel
              images={images}
              alt={species.data.scientificName}
              resetKey={species.id}
              heightClassName="h-full"
              fullScreenLightboxProps={{
                captions: { hidden: true, showToggle: false },
              }}
            />
          </div>

          <div
            className={`absolute inset-0 flex h-full flex-col justify-center bg-card p-8 transition-all duration-500 ${
              flipped ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Back - Information */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  {species.data.scientificName}
                </h2>
                <div className="space-y-1">
                  {vernacularName && (
                    <p className="text-xl text-primary">{vernacularName}</p>
                  )}
                </div>
              </div>

              {description && (
                <div className="pt-4 border-t">
                  <div
                    className="text-muted-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 sm:inset-x-8">
        <Button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          variant="outline"
          size="lg"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          <Button onClick={handleFlip} variant="outline" size="lg">
            <RotateCw className="mr-1 h-4 w-4" />
            Flip Card
          </Button>
          <TooltipProvider>
            <Tooltip
              open={keyboardTooltipOpen}
              onOpenChange={setKeyboardTooltipOpen}
            >
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Keyboard shortcuts"
                  onClick={() => setKeyboardTooltipOpen(true)}
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="w-56">
                <div className="space-y-2 text-xs">
                  <div className="text-muted-foreground">Shortcuts</div>
                  <div className="space-y-1">
                    {shortcutContent.map((shortcut) => (
                      <div
                        key={shortcut.label}
                        className="flex items-center justify-between gap-2"
                      >
                        <span>{shortcut.label}</span>
                        <span className="flex items-center gap-1">
                          {shortcut.keys.map((key) => (
                            <kbd
                              key={key}
                              className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] text-muted-foreground"
                            >
                              {key}
                            </kbd>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Button
          onClick={handleNext}
          disabled={currentIndex === total - 1}
          size="lg"
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
