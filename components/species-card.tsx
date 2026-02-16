"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import sanitizeHtml from "sanitize-html";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { KeyboardHint } from "@/components/ui/keyboard-hint";
import type {
  LocalizedText,
  Species,
  SpeciesIdentificationHint,
} from "@/lib/types";
import {
  getLocalizedText,
  getSpeciesDescription,
  getSpeciesImageUrl,
} from "@/lib/content/content-display";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ChevronRight, ExternalLink, Keyboard, X } from "lucide-react";
import { SpeciesImageCarousel } from "@/components/species-image-carousel";
import { useLanguagePreference } from "@/lib/language-context";
import { toLanguageCode } from "@/lib/local-preferences";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  fetchPinkkaSpecies,
  type PinkkaSpeciesDetail,
} from "@/lib/pinkka/pinkka-api";
import { PinkkaSpeciesDetail as PinkkaSpeciesDetailPanel } from "@/components/pinkka/pinkka-species-detail";

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

interface ResolvedIdentificationHint {
  id: string;
  text: string;
  imageIndex?: number;
}

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
  const [isCarouselModalOpen, setIsCarouselModalOpen] = useState(false);
  const [activeHintId, setActiveHintId] = useState<string | null>(null);
  const [carouselState, setCarouselState] = useState<{
    speciesId: string;
    activeIndex: number;
  }>({
    speciesId: species.id,
    activeIndex: 0,
  });
  const pendingHintNavigationRef = useRef(false);
  const [activeInfoTab, setActiveInfoTab] = useState<InfoTab>("pinkka");
  const [pinkkaDetail, setPinkkaDetail] = useState<PinkkaSpeciesDetail | null>(
    null,
  );
  const [pinkkaLoading, setPinkkaLoading] = useState(false);
  const [pinkkaLoadFailed, setPinkkaLoadFailed] = useState(false);
  const pinkkaDetailCacheRef = useRef<
    Record<number, PinkkaSpeciesDetail | null>
  >({});

  const images = useMemo(
    () => species.data.images ?? [],
    [species.data.images],
  );
  const pinkkaSpeciesId = species.pinkkaRef?.speciesId ?? null;
  const vernacularName = getLocalizedText(
    species.data.vernacularName,
    preferredLanguage,
  );
  const description = getSpeciesDescription(species.data, preferredLanguage);
  const carouselImageIds = useMemo(
    () =>
      images
        .filter((image) => Boolean(getSpeciesImageUrl(image)))
        .map((image) => image.id),
    [images],
  );
  const normalizedCarouselState =
    carouselState.speciesId === species.id
      ? carouselState
      : {
          speciesId: species.id,
          activeIndex: 0,
        };
  const activeCarouselIndex = normalizedCarouselState.activeIndex;

  const identificationHints = useMemo<ResolvedIdentificationHint[]>(() => {
    const rawHints = (species.data.identificationHints ?? []) as Array<
      SpeciesIdentificationHint | LocalizedText
    >;
    const localizedHints = rawHints
      .map((hint, index) => {
        const textSource = "text" in hint ? hint.text : hint;
        const text = getLocalizedText(textSource, preferredLanguage).trim();
        if (!text) return null;

        const imageId = "imageId" in hint ? hint.imageId : undefined;
        const imageIndex = imageId ? carouselImageIds.indexOf(imageId) : -1;

        return {
          id: "id" in hint ? hint.id : `legacy-hint-${index}`,
          text,
          ...(imageIndex >= 0 ? { imageIndex } : {}),
        };
      })
      .filter((hint): hint is ResolvedIdentificationHint => hint !== null);

    if (localizedHints.length > 0) {
      return localizedHints;
    }

    return (species.data.identificationTips ?? [])
      .map((hint) => hint.trim())
      .filter((hint) => hint.length > 0)
      .map((hint, index) => ({
        id: `legacy-tip-${index}-${hint}`,
        text: hint,
      }));
  }, [
    carouselImageIds,
    preferredLanguage,
    species.data.identificationHints,
    species.data.identificationTips,
  ]);
  const sanitizedDescription = useMemo(
    () => (description ? sanitizeHtml(description) : ""),
    [description],
  );

  useEffect(() => {
    if (!pinkkaSpeciesId) {
      setPinkkaDetail(null);
      setPinkkaLoading(false);
      setPinkkaLoadFailed(false);
      return;
    }

    const cached = pinkkaDetailCacheRef.current[pinkkaSpeciesId];
    if (cached !== undefined) {
      setPinkkaDetail(cached);
      setPinkkaLoading(false);
      setPinkkaLoadFailed(!cached);
      return;
    }

    setPinkkaDetail(null);
    setPinkkaLoadFailed(false);
  }, [pinkkaSpeciesId]);

  useEffect(() => {
    if (!isInfoPanelOpen || activeInfoTab !== "pinkka" || !pinkkaSpeciesId) {
      return;
    }

    const cached = pinkkaDetailCacheRef.current[pinkkaSpeciesId];
    if (cached !== undefined) {
      setPinkkaDetail(cached);
      setPinkkaLoadFailed(!cached);
      return;
    }

    let isCancelled = false;
    setPinkkaLoading(true);
    setPinkkaLoadFailed(false);

    void fetchPinkkaSpecies(pinkkaSpeciesId)
      .then((detail) => {
        if (isCancelled) return;
        pinkkaDetailCacheRef.current[pinkkaSpeciesId] = detail;
        setPinkkaDetail(detail);
        setPinkkaLoadFailed(!detail);
      })
      .catch(() => {
        if (isCancelled) return;
        pinkkaDetailCacheRef.current[pinkkaSpeciesId] = null;
        setPinkkaDetail(null);
        setPinkkaLoadFailed(true);
      })
      .finally(() => {
        if (isCancelled) return;
        setPinkkaLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeInfoTab, isInfoPanelOpen, pinkkaSpeciesId]);

  const handleCarouselIndexChange = (index: number) => {
    if (index === activeCarouselIndex) {
      return;
    }

    setCarouselState({
      speciesId: species.id,
      activeIndex: index,
    });

    if (pendingHintNavigationRef.current) {
      pendingHintNavigationRef.current = false;
      return;
    }

    setActiveHintId(null);
  };

  const handleHintClick = (hint: ResolvedIdentificationHint) => {
    if (activeHintId === hint.id) {
      setActiveHintId(null);
      return;
    }

    setActiveHintId(hint.id);

    if (hint.imageIndex === undefined) {
      return;
    }

    if (hint.imageIndex === activeCarouselIndex) {
      return;
    }

    pendingHintNavigationRef.current = true;
    handleCarouselIndexChange(hint.imageIndex);
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (
        event.target.closest(
          "button, a, input, textarea, select, [role='button'], [role='link'], [role='option'], [data-interactive='true']",
        )
      ) {
        return;
      }
      setActiveHintId(null);
    };

    window.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
    };
  }, []);

  const shortcutContent = useMemo(
    () => [
      { label: t("learn.cards.shortcut.toggleInfoPanel"), keys: ["Space"] },
      { label: t("learn.cards.shortcut.openLarger"), keys: ["Z"] },
      { label: t("learn.cards.shortcut.zoomOut"), keys: ["X"] },
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
        if (isCarouselModalOpen) return;
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
  }, [
    isCarouselModalOpen,
    isInfoPanelOpen,
    onNext,
    onPrevious,
    onToggleInfoPanel,
  ]);

  return (
    <div className="relative h-full w-full">
      <Card className="absolute inset-x-4 top-0 bottom-24 overflow-hidden p-0 sm:inset-x-8">
        <CardContent className="h-full p-0">
          <div
            className={`h-full min-h-0 ${
              isInfoPanelOpen
                ? "grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
                : ""
            }`}
          >
            <div
              className={
                isInfoPanelOpen
                  ? "min-h-0 border-b md:border-b-0 md:border-r"
                  : "h-full"
              }
            >
              <div data-interactive="true" className="h-full">
                <SpeciesImageCarousel
                  images={images}
                  alt={species.data.scientificName}
                  resetKey={species.id}
                  activeIndex={activeCarouselIndex}
                  onIndexChange={handleCarouselIndexChange}
                  onModalOpenChange={setIsCarouselModalOpen}
                  heightClassName="h-full"
                  fullScreenLightboxProps={{
                    captions: { hidden: true, showToggle: false },
                    zoom: { maxZoomPixelRatio: 3 },
                  }}
                />
              </div>
            </div>
            {isInfoPanelOpen ? (
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
                  <div className="inline-flex gap-1">
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
                      <KeyboardHint keys={["1"]} />{" "}
                      {t("learn.cards.info.tab.identification")}
                    </Button>
                    <Button
                      type="button"
                      variant={
                        activeInfoTab === "pinkka" ? "secondary" : "ghost"
                      }
                      size="sm"
                      onClick={() => setActiveInfoTab("pinkka")}
                    >
                      <KeyboardHint keys={["2"]} />{" "}
                      {t("learn.cards.info.tab.pinkka")}
                    </Button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {activeInfoTab === "identification" ? (
                    identificationHints.length > 0 ? (
                      <ul className="space-y-2">
                        {identificationHints.map((hint) => {
                          const isActive = activeHintId === hint.id;
                          return (
                            <li key={hint.id}>
                              <button
                                type="button"
                                className={cn(
                                  "w-full rounded-md border border-border px-3 py-2 text-left text-sm transition-colors duration-200",
                                  isActive
                                    ? "bg-primary hover:bg-primary/90 text-background/90"
                                    : "bg-muted hover:bg-muted/60 hover:text-foreground/90",
                                )}
                                onClick={() => handleHintClick(hint)}
                                aria-pressed={isActive}
                              >
                                {hint.text}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t("learn.cards.info.identificationPlaceholder")}
                      </p>
                    )
                  ) : (
                    <div className="space-y-3">
                      {pinkkaSpeciesId ? (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-sm font-medium"
                          asChild
                        >
                          <a
                            href={`https://pinkka.laji.fi/pinkat/#/speciescards/${pinkkaSpeciesId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            pinkka
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      ) : null}
                      {pinkkaLoading ? (
                        <div className="py-3 flex justify-center">
                          <LoadingSpinner />
                        </div>
                      ) : pinkkaDetail ? (
                        <PinkkaSpeciesDetailPanel
                          detail={pinkkaDetail}
                          preferredLang={preferredLanguage}
                          showSpeciesHeader={false}
                          showImages={false}
                        />
                      ) : description ? (
                        <div
                          className="text-sm leading-relaxed text-muted-foreground [&_p]:mb-4 [&_p:last-child]:mb-0"
                          dangerouslySetInnerHTML={{
                            __html: sanitizedDescription,
                          }}
                        />
                      ) : pinkkaLoadFailed ? (
                        <p className="text-sm text-muted-foreground">
                          {t("learn.cards.info.noDescription")}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t("learn.cards.info.noDescription")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </aside>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 sm:inset-x-8">
        <Button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          variant="outline"
          size="lg"
        >
          <KeyboardHint keys={["⌘/Ctrl", "←"]} /> {t("learn.cards.previous")}
        </Button>

        <div className="flex items-center gap-2">
          <Button onClick={onToggleInfoPanel} variant="outline" size="lg">
            <KeyboardHint keys={["Space"]} />
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
                        <KeyboardHint keys={shortcut.keys} />
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
          <KeyboardHint keys={["⌘/Ctrl", "→"]} />
          {t("learn.cards.next")}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
