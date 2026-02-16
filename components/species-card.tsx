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
import { useI18n } from "@/lib/i18n";
import { ChevronLeft, ChevronRight, Keyboard, RotateCw, X } from "lucide-react";
import { SpeciesImageCarousel } from "@/components/species-image-carousel";
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";

/** Props for the species-card viewer. */
interface SpeciesCardProps {
  /** Species displayed on the card. */
  species: Species;
  /** Advance to the next item. */
  onNext: () => void;
  /** Navigate to the previous item. */
  onPrevious: () => void;
  /** Zero-based index of the current item. */
  currentIndex: number;
  /** Total number of items in the session. */
  total: number;
  /** Whether the info pane is currently visible. */
  isInfoPanelOpen: boolean;
  /** Toggle the info pane visibility. */
  onToggleInfoPanel: () => void;
}

type InfoTab = "identification" | "pinkka";

/** Interactive learning view with image navigation and side info pane controls. */
export function SpeciesCard({
  species,
  onNext,
  onPrevious,
  currentIndex,
  total,
  isInfoPanelOpen,
  onToggleInfoPanel,
}: SpeciesCardProps) {
  const { language } = useLanguagePreference();
  const { t } = useI18n();
  const preferredLanguage = toLanguageCode(language);
  const [keyboardTooltipOpen, setKeyboardTooltipOpen] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<InfoTab>("pinkka");

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
      { label: t("learn.cards.shortcut.toggleInfoPanel"), keys: ["Space"] },
      { label: t("learn.cards.shortcut.openLarger"), keys: ["↑"] },
      { label: t("learn.cards.shortcut.zoomOut"), keys: ["↓"] },
      { label: t("learn.cards.shortcut.previousImage"), keys: ["←"] },
      { label: t("learn.cards.shortcut.nextImage"), keys: ["→"] },
      {
        label: t("learn.cards.shortcut.previousSpecies"),
        keys: ["⌘/Ctrl", "←"],
      },
      { label: t("learn.cards.shortcut.nextSpecies"), keys: ["⌘/Ctrl", "→"] },
      { label: t("learn.cards.shortcut.showIdentificationTab"), keys: ["1"] },
      { label: t("learn.cards.shortcut.showPinkkaTab"), keys: ["2"] },
    ],
    [t],
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
        onToggleInfoPanel();
        return;
      }

      if (isInfoPanelOpen && event.key === "1") {
        event.preventDefault();
        setActiveInfoTab("identification");
        return;
      }

      if (isInfoPanelOpen && event.key === "2") {
        event.preventDefault();
        setActiveInfoTab("pinkka");
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
  }, [isInfoPanelOpen, onNext, onPrevious, onToggleInfoPanel]);

  return (
    <div className="relative h-full w-full">
      <Card className="absolute inset-x-4 top-0 bottom-24 overflow-hidden p-0 sm:inset-x-8">
        <CardContent className="h-full p-0">
          {isInfoPanelOpen ? (
            <div className="grid h-full min-h-0 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="min-h-0 border-b md:border-b-0 md:border-r">
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
              <aside className="flex min-h-0 flex-col bg-card">
                <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                  <div>
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
                    onClick={onToggleInfoPanel}
                    aria-label={t("learn.cards.info.hideAria")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="border-b px-4 py-2">
                  <div className="inline-flex rounded-md border border-border bg-muted/40 p-1">
                    <Button
                      type="button"
                      variant={
                        activeInfoTab === "identification"
                          ? "secondary"
                          : "ghost"
                      }
                      size="sm"
                      onClick={() => setActiveInfoTab("identification")}
                    >
                      1. {t("learn.cards.info.tab.identification")}
                    </Button>
                    <Button
                      type="button"
                      variant={
                        activeInfoTab === "pinkka" ? "secondary" : "ghost"
                      }
                      size="sm"
                      onClick={() => setActiveInfoTab("pinkka")}
                    >
                      2. {t("learn.cards.info.tab.pinkka")}
                    </Button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {activeInfoTab === "identification" ? (
                    <p className="text-sm text-muted-foreground">
                      {t("learn.cards.info.identificationPlaceholder")}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {description ? (
                        <div
                          className="text-sm leading-relaxed text-muted-foreground [&_p]:mb-4 [&_p:last-child]:mb-0"
                          dangerouslySetInnerHTML={{
                            __html: sanitizedDescription,
                          }}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t("learn.cards.info.noDescription")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          ) : (
            <SpeciesImageCarousel
              images={images}
              alt={species.data.scientificName}
              resetKey={species.id}
              heightClassName="h-full"
              fullScreenLightboxProps={{
                captions: { hidden: true, showToggle: false },
              }}
            />
          )}
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
          {t("learn.cards.previous")}
        </Button>

        <div className="flex items-center gap-2">
          <Button onClick={onToggleInfoPanel} variant="outline" size="lg">
            <RotateCw className="mr-1 h-4 w-4" />
            {isInfoPanelOpen
              ? t("learn.cards.info.hide")
              : t("learn.cards.info.show")}
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
                  aria-label={t("learn.cards.keyboardAria")}
                  onClick={() => setKeyboardTooltipOpen(true)}
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="w-56">
                <div className="space-y-2 text-xs">
                  <div className="text-muted-foreground">
                    {t("learn.cards.shortcutsTitle")}
                  </div>
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
          {t("learn.cards.next")}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
