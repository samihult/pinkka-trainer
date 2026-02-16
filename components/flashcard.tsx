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
import { ChevronLeft, ChevronRight, Keyboard, RotateCw, X } from "lucide-react";
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
  /** Whether the backside panel is currently visible. */
  isBacksidePanelOpen: boolean;
  /** Toggle the backside panel visibility. */
  onToggleBacksidePanel: () => void;
}

/** Interactive flashcard with image navigation and backside panel controls. */
export function Flashcard({
  species,
  onNext,
  onPrevious,
  currentIndex,
  total,
  isBacksidePanelOpen,
  onToggleBacksidePanel,
}: FlashcardProps) {
  const { language } = useLanguagePreference();
  const preferredLanguage = toLanguageCode(language);
  const [keyboardTooltipOpen, setKeyboardTooltipOpen] = useState(false);

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
      { label: "Toggle backside panel", keys: ["Space"] },
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
        onToggleBacksidePanel();
        return;
      }

      if (event.metaKey || event.ctrlKey) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onPrevious();
          return;
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          onNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNext, onPrevious, onToggleBacksidePanel]);

  return (
    <div className="relative h-full w-full">
      <Card className="absolute inset-x-4 top-0 bottom-24 overflow-hidden p-0 sm:inset-x-8">
        <CardContent className="h-full p-0">
          <SpeciesImageCarousel
            images={images}
            alt={species.data.scientificName}
            resetKey={species.id}
            heightClassName="h-full"
            fullScreenLightboxProps={{
              captions: { hidden: true, showToggle: false },
            }}
          />

          {isBacksidePanelOpen ? (
            <div className="absolute top-4 right-4 bottom-4 z-10 flex w-[min(30rem,calc(100%-2rem))]">
              <div className="flex h-full w-full flex-col rounded-lg border border-border/80 bg-card/95 shadow-lg backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Backside
                    </p>
                    <h2 className="line-clamp-2 text-lg font-semibold">
                      {species.data.scientificName}
                    </h2>
                    {vernacularName ? (
                      <p className="text-sm text-primary">{vernacularName}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onToggleBacksidePanel}
                    aria-label="Hide backside panel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {description ? (
                    <div
                      className="text-sm text-muted-foreground leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0"
                      dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No description available.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 sm:inset-x-8">
        <Button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          variant="outline"
          size="lg"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          <Button onClick={onToggleBacksidePanel} variant="outline" size="lg">
            <RotateCw className="mr-1 h-4 w-4" />
            {isBacksidePanelOpen ? "Hide Backside" : "Show Backside"}
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
          onClick={onNext}
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
