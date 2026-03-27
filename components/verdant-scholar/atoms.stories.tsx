import type { Meta, StoryObj } from "@storybook/react";
import { Bookmark, Search, Sparkles } from "lucide-react";

import { VerdantScholarBadge } from "./atoms/badge";
import { VerdantScholarButton } from "./atoms/button";
import { VerdantScholarCard, VerdantScholarCardContent } from "./atoms/card";
import { VerdantScholarChoiceCard } from "./atoms/choice-card";
import { VerdantScholarChoiceChip } from "./atoms/choice-chip";
import { VerdantScholarIconButton } from "./atoms/icon-button";
import { VerdantScholarInput } from "./atoms/input";
import { VerdantScholarProgressBar } from "./atoms/progress-bar";
import { VerdantScholarHeading, VerdantScholarText } from "./atoms/text";
import { VerdantScholarTheme } from "./verdant-scholar-theme";

const meta: Meta = {
  title: "Verdant Scholar/Atoms/Overview",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};

export default meta;

type Story = StoryObj;

export const Gallery: Story = {
  name: "Gallery",
  render: () => (
    <VerdantScholarTheme className="space-y-8">
      <div className="space-y-2">
        <p className="text-[length:var(--vs-font-label-sm)] font-bold uppercase tracking-[0.22em] text-[var(--vs-color-primary)]">
          Atoms
        </p>
        <h1 className="text-[length:var(--vs-font-headline-md)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
          Editorial controls and quiet feedback
        </h1>
      </div>
      <div className="grid gap-6 rounded-[var(--vs-radius-xl)] bg-[var(--vs-color-surface-container-low)] p-6">
        <div className="flex flex-wrap gap-3">
          <VerdantScholarButton leadingIcon={<Sparkles className="size-4" />}>
            Primary CTA
          </VerdantScholarButton>
          <VerdantScholarButton variant="secondary">
            Secondary CTA
          </VerdantScholarButton>
          <VerdantScholarButton variant="ghost">
            Ghost Link
          </VerdantScholarButton>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <VerdantScholarBadge>Taxonomy Tag</VerdantScholarBadge>
          <VerdantScholarBadge tone="neutral">
            Floating Status
          </VerdantScholarBadge>
          <VerdantScholarBadge tone="tertiary">Priority</VerdantScholarBadge>
          <VerdantScholarBadge tone="danger">Endangered</VerdantScholarBadge>
        </div>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <VerdantScholarInput
            actionLabel="Search"
            aria-label="Search species"
            placeholder="Search species, genus, or family..."
          />
          <div className="flex items-center gap-3">
            <VerdantScholarIconButton aria-label="Search" tone="ghost">
              <Search className="size-4" />
            </VerdantScholarIconButton>
            <VerdantScholarIconButton aria-label="Bookmark" tone="surface">
              <Bookmark className="size-4" />
            </VerdantScholarIconButton>
          </div>
        </div>
        <div className="max-w-sm space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm text-[var(--vs-color-on-surface-variant)]">
            <span>Current module readiness</span>
            <span>68%</span>
          </div>
          <VerdantScholarProgressBar value={68} />
        </div>
        <div className="flex flex-wrap gap-2">
          <VerdantScholarChoiceChip selected>Species</VerdantScholarChoiceChip>
          <VerdantScholarChoiceChip>Genus</VerdantScholarChoiceChip>
          <VerdantScholarChoiceChip>Family</VerdantScholarChoiceChip>
        </div>
        <VerdantScholarChoiceCard
          description="Identify the specimen from four distinct options."
          title="Multiple Choice"
        />
        <VerdantScholarCard className="max-w-lg">
          <VerdantScholarCardContent className="space-y-3 pt-6">
            <VerdantScholarText tone="primary" variant="eyebrow">
              Text Styles
            </VerdantScholarText>
            <VerdantScholarHeading variant="headline">
              Editorial hierarchy
            </VerdantScholarHeading>
            <VerdantScholarText tone="muted">
              Shared heading and body atoms keep the Verdant Scholar typography
              consistent across molecules and organisms.
            </VerdantScholarText>
          </VerdantScholarCardContent>
        </VerdantScholarCard>
      </div>
    </VerdantScholarTheme>
  ),
};
