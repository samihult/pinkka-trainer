/** Verdant Scholar study viewer mirrors the Stitch study mode layout. */
import {
  BookOpen,
  Expand,
  ImageIcon,
  Info,
  Lightbulb,
  MoveLeft,
  MoveRight,
  Settings,
} from "lucide-react";

import { VerdantScholarIconButton } from "../atoms/icon-button";
import { VerdantScholarProgressBar } from "../atoms/progress-bar";
import {
  VerdantScholarFactCard,
  type VerdantScholarFactRow,
} from "../molecules/fact-card";

/** Sidebar fact section for the study viewer. */
export interface VerdantScholarStudySidebarSection {
  rows?: VerdantScholarFactRow[];
  summary?: string;
  title: string;
}

/** Thumbnail metadata for the study viewer bottom rail. */
export interface VerdantScholarStudyThumbnail {
  imageAlt: string;
  imageUrl: string;
  selected?: boolean;
}

/**
 * Props for the Verdant Scholar study viewer organism.
 * @property currentIndex Current position label.
 * @property heroDescription Secondary specimen description.
 * @property heroImageAlt Accessible hero image description.
 * @property heroImageUrl Main specimen image.
 * @property heroLabel Small specimen label.
 * @property sessionProgress Percentage for the session progress bar.
 * @property sidebarSections Sidebar sections with morphology and ecological notes.
 * @property thumbnails Thumbnail rail items.
 * @property title Specimen title.
 */
export interface VerdantScholarStudyViewerProps {
  currentIndex: string;
  heroDescription: string;
  heroImageAlt: string;
  heroImageUrl: string;
  heroLabel: string;
  sessionProgress: number;
  sidebarSections: VerdantScholarStudySidebarSection[];
  thumbnails: VerdantScholarStudyThumbnail[];
  title: string;
}

/** Immersive specimen study viewer with vertical tools, sidebar facts, and thumbnail rail. */
export function VerdantScholarStudyViewer({
  currentIndex,
  heroDescription,
  heroImageAlt,
  heroImageUrl,
  heroLabel,
  sessionProgress,
  sidebarSections,
  thumbnails,
  title,
}: VerdantScholarStudyViewerProps) {
  return (
    <div className="grid min-h-screen gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="relative flex flex-col px-6 pb-8 pt-8 lg:px-8">
        <div className="absolute left-6 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
          <VerdantScholarIconButton aria-label="Images" tone="activeToolbar">
            <ImageIcon className="size-4" />
          </VerdantScholarIconButton>
          <VerdantScholarIconButton aria-label="Info" tone="toolbar">
            <Info className="size-4" />
          </VerdantScholarIconButton>
          <VerdantScholarIconButton aria-label="Hints" tone="toolbar">
            <Lightbulb className="size-4" />
          </VerdantScholarIconButton>
          <VerdantScholarIconButton
            aria-label="Expand"
            className="mt-3 rounded-full bg-white"
            tone="surface"
          >
            <Expand className="size-4" />
          </VerdantScholarIconButton>
        </div>

        <div className="overflow-hidden rounded-[var(--vs-radius-xl)] bg-[var(--vs-color-inverse-surface)] shadow-[var(--vs-shadow-floating)]">
          <img
            alt={heroImageAlt}
            className="aspect-[4/3] w-full object-cover lg:aspect-[16/11]"
            src={heroImageUrl}
          />
        </div>

        <div className="-mt-16 max-w-md rounded-[var(--vs-radius-xl)] bg-[var(--vs-color-surface-container-lowest)] p-6 shadow-[var(--vs-shadow-floating)] lg:ml-4">
          <p className="text-[length:var(--vs-font-label-md)] font-bold uppercase tracking-[0.22em] text-[var(--vs-color-primary)]">
            {heroLabel}
          </p>
          <h1 className="mt-3 text-[length:var(--vs-font-display-md)] leading-none text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-extrabold tracking-tight">
            {title}
          </h1>
          <p className="mt-3 text-lg italic text-[var(--vs-color-on-surface-variant)]">
            {heroDescription}
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-4 pt-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <VerdantScholarIconButton aria-label="Previous" tone="surface">
              <MoveLeft className="size-4" />
            </VerdantScholarIconButton>
            <div className="rounded-[var(--vs-radius-pill)] bg-[var(--vs-color-surface-container-low)] px-5 py-3 text-sm font-semibold text-[var(--vs-color-on-surface)]">
              {currentIndex}
            </div>
            <VerdantScholarIconButton aria-label="Next" tone="activeToolbar">
              <MoveRight className="size-4" />
            </VerdantScholarIconButton>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {thumbnails.map((thumbnail, index) => (
              <div
                key={`${thumbnail.imageUrl}-${index}`}
                className={
                  thumbnail.selected
                    ? "rounded-[var(--vs-radius-sm)] p-1 shadow-[inset_0_0_0_2px_rgba(63,106,0,0.7)]"
                    : "rounded-[var(--vs-radius-sm)] p-1"
                }
              >
                <img
                  alt={thumbnail.imageAlt}
                  className="size-12 rounded-[var(--vs-radius-xs)] object-cover md:size-14"
                  src={thumbnail.imageUrl}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <aside className="flex flex-col gap-6 bg-[var(--vs-color-surface-container-low)] p-6 lg:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[length:var(--vs-font-label-md)] font-bold uppercase tracking-[0.18em] text-[var(--vs-color-on-surface-variant)]">
              Taxonomy & Data
            </p>
          </div>
          <BookOpen className="size-5 text-[var(--vs-color-on-surface-variant)]" />
        </div>
        <div className="space-y-4">
          {sidebarSections.map((section) => (
            <VerdantScholarFactCard
              key={section.title}
              rows={section.rows}
              summary={section.summary}
              title={section.title}
              tone={section.title === "Memory Anchor" ? "soft" : "surface"}
            />
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between gap-4 border-t border-[color:rgba(194,201,180,0.2)] pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--vs-color-on-surface-variant)]">
            <Settings className="size-4" />
            <span>Stack Options</span>
          </div>
          <div className="w-full max-w-32 space-y-2">
            <p className="text-[length:var(--vs-font-label-sm)] uppercase tracking-[0.18em] text-[var(--vs-color-on-surface-variant)]">
              Session Progress
            </p>
            <VerdantScholarProgressBar value={sessionProgress} />
          </div>
        </div>
      </aside>
    </div>
  );
}
