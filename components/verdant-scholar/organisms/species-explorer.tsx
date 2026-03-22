/** Verdant Scholar species explorer mirrors the Stitch explore species layout. */
import { Grid2x2, List } from "lucide-react";

import { VerdantScholarButton } from "../atoms/button";
import { VerdantScholarIconButton } from "../atoms/icon-button";
import {
  VerdantScholarFilterGroup,
  type VerdantScholarFilterGroupProps,
} from "../molecules/filter-group";
import {
  VerdantScholarSpecimenCard,
  type VerdantScholarSpecimenCardProps,
} from "../molecules/specimen-card";
import { VerdantScholarFooter, type VerdantScholarFooterProps } from "./footer";
import {
  VerdantScholarTopNavigation,
  type VerdantScholarTopNavigationProps,
} from "./top-navigation";

/** Pagination metadata for the species explorer. */
export interface VerdantScholarExplorerPagination {
  currentPage: number;
  pageCountLabel: string;
}

/**
 * Props for the Verdant Scholar species explorer.
 * @property cards Gallery cards shown in the results grid.
 * @property filterActionLabel Primary filter action label.
 * @property filterGroups Sidebar filter groups.
 * @property footer Shared footer props.
 * @property navigation Shared navigation props.
 * @property pagination Pagination metadata.
 * @property resultsLabel Small results eyebrow.
 * @property title Primary screen title.
 */
export interface VerdantScholarSpeciesExplorerProps {
  cards: VerdantScholarSpecimenCardProps[];
  filterActionLabel: string;
  filterGroups: VerdantScholarFilterGroupProps[];
  footer: VerdantScholarFooterProps;
  navigation: VerdantScholarTopNavigationProps;
  pagination: VerdantScholarExplorerPagination;
  resultsLabel: string;
  title: string;
}

/** Explore screen organism with tonal sidebar filters and specimen gallery. */
export function VerdantScholarSpeciesExplorer({
  cards,
  filterActionLabel,
  filterGroups,
  footer,
  navigation,
  pagination,
  resultsLabel,
  title,
}: VerdantScholarSpeciesExplorerProps) {
  return (
    <div className="space-y-12">
      <VerdantScholarTopNavigation {...navigation} />
      <main className="mx-auto grid w-full max-w-[var(--vs-layout-max-width)] gap-12 px-6 pb-10 lg:grid-cols-[var(--vs-layout-sidebar-width)_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-8 pt-8 lg:sticky lg:top-28 lg:self-start">
          <div className="space-y-6">
            <h2 className="text-base text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
              Refine Results
            </h2>
            {filterGroups.map((group) => (
              <VerdantScholarFilterGroup key={group.title} {...group} />
            ))}
          </div>
          <VerdantScholarButton className="w-full justify-center">
            {filterActionLabel}
          </VerdantScholarButton>
        </aside>

        <section className="space-y-10 pt-8">
          <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[length:var(--vs-font-label-md)] font-bold uppercase tracking-[0.22em] text-[var(--vs-color-primary)]">
                {resultsLabel}
              </p>
              <h1 className="mt-2 text-[length:var(--vs-font-display-md)] leading-none text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-extrabold tracking-tight">
                {title}
              </h1>
            </div>
            <div className="flex items-center gap-2 rounded-[var(--vs-radius-sm)] bg-[var(--vs-color-surface-container-low)] p-1">
              <VerdantScholarIconButton aria-label="Grid view" tone="surface">
                <Grid2x2 className="size-4 text-[var(--vs-color-primary)]" />
              </VerdantScholarIconButton>
              <VerdantScholarIconButton aria-label="List view" tone="toolbar">
                <List className="size-4" />
              </VerdantScholarIconButton>
            </div>
          </header>

          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <VerdantScholarSpecimenCard
                key={`${card.title}-${card.scientificName}`}
                {...card}
              />
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 rounded-[var(--vs-radius-pill)] bg-[var(--vs-color-surface-container-low)] px-4 py-2 text-sm">
            <span className="opacity-50">‹</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-[var(--vs-color-primary)] text-[var(--vs-color-on-primary)]">
              {pagination.currentPage}
            </span>
            <span className="text-[var(--vs-color-on-surface-variant)]">
              {pagination.pageCountLabel}
            </span>
            <span className="opacity-50">›</span>
          </div>
        </section>
      </main>
      <VerdantScholarFooter {...footer} />
    </div>
  );
}
