"use client";

import type { ReactNode } from "react";

import { useEffect, useMemo } from "react";

import Link from "next/link";
import { ChevronRight, Pencil } from "lucide-react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  buildExpandedSpeciesTaxonomyNodeIds,
  type SpeciesTaxonomyBranchNode,
  type SpeciesTaxonomyRank,
  type SpeciesTaxonomyTreeNode,
} from "@/lib/content/species-taxonomy-tree";
import type { Species } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Props for the canonical species taxonomy tree component. */
export interface SpeciesTaxonomyTreeProps {
  /** Tree nodes to render. */
  nodes: SpeciesTaxonomyTreeNode[];
  /** Localized labels for the fixed taxonomy ranks. */
  rankLabels: Record<SpeciesTaxonomyRank, string>;
  /** Localized fallback label when a species has no vernacular name. */
  noVernacularNameLabel: string;
  /** Localized visibility label for hidden species entries. */
  hiddenLabel: string;
  /** Localized visibility label for visible species entries. */
  visibleLabel: string;
  /** Optional href builder for editing species leaves. */
  getLeafEditHref?: (species: Species) => string;
  /** Optional renderer for the right-hand leaf slot. */
  renderLeafAside?: (species: Species) => ReactNode;
  /** Optional node id that should be scrolled into view and focused. */
  focusNodeId?: string;
  /** Optional node id that should be visually emphasized as the current match. */
  highlightedNodeId?: string;
  /** Optional search query used to highlight matching text. */
  highlightQuery?: string;
  /** Whether the tree should move DOM focus to the selected node automatically. */
  autoFocusNode?: boolean;
  /** Optional callback fired when any taxonomy node is selected. */
  onNodeSelect?: (nodeId: string) => void;
  /** Localized label for the species edit action. */
  editLeafLabel?: string;
}

interface TaxonomyTreeBranchProps {
  /** Branch node to render recursively. */
  node: SpeciesTaxonomyBranchNode;
  /** Localized rank labels. */
  rankLabels: SpeciesTaxonomyTreeProps["rankLabels"];
  /** Localized fallback when vernacular names are missing. */
  noVernacularNameLabel: string;
  /** Localized hidden label. */
  hiddenLabel: string;
  /** Localized visible label. */
  visibleLabel: string;
  /** Nesting depth used for subtle connector styling. */
  depth: number;
  /** Optional href builder for editing species leaves. */
  getLeafEditHref?: SpeciesTaxonomyTreeProps["getLeafEditHref"];
  /** Optional renderer for the right-hand leaf slot. */
  renderLeafAside?: SpeciesTaxonomyTreeProps["renderLeafAside"];
  /** Optional node id that should be scrolled into view and focused. */
  focusNodeId?: SpeciesTaxonomyTreeProps["focusNodeId"];
  /** Optional node id that should be visually emphasized as the current match. */
  highlightedNodeId?: SpeciesTaxonomyTreeProps["highlightedNodeId"];
  /** Optional search query used to highlight matching text. */
  highlightQuery?: SpeciesTaxonomyTreeProps["highlightQuery"];
  /** Optional callback fired when any taxonomy node is selected. */
  onNodeSelect?: SpeciesTaxonomyTreeProps["onNodeSelect"];
  /** Localized label for the species edit action. */
  editLeafLabel?: SpeciesTaxonomyTreeProps["editLeafLabel"];
  /** Expanded branch ids driven from the current URL focus state. */
  expandedNodeIds: Set<string>;
}

function RankBadge({
  rank,
  rankLabels,
}: {
  rank: SpeciesTaxonomyRank;
  rankLabels: SpeciesTaxonomyTreeProps["rankLabels"];
}) {
  return (
    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.18em] text-emerald-700 uppercase dark:text-emerald-300">
      {rankLabels[rank]}
    </span>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedText(text: string, highlightQuery?: string) {
  const query = highlightQuery?.trim();
  if (!query) {
    return text;
  }

  const pattern = new RegExp(`(${escapeRegExp(query)})`, "gi");
  const parts = text.split(pattern);

  if (parts.length === 1) {
    return text;
  }

  return parts.map((part, index) =>
    part.toLocaleLowerCase() === query.toLocaleLowerCase() ? (
      <mark
        key={`${part}-${index}`}
        className="rounded-sm bg-emerald-200/80 px-0.5 text-emerald-950 dark:bg-emerald-500/35 dark:text-emerald-50"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

function renderDefaultLeafAside(
  species: Species,
  hiddenLabel: string,
  visibleLabel: string,
) {
  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {species.isHidden ? hiddenLabel : visibleLabel}
    </span>
  );
}

function LeafAside({
  species,
  hiddenLabel,
  visibleLabel,
  renderLeafAside,
}: {
  species: Species;
  hiddenLabel: string;
  visibleLabel: string;
  renderLeafAside?: SpeciesTaxonomyTreeProps["renderLeafAside"];
}) {
  return (
    <>
      {renderLeafAside
        ? (renderLeafAside(species) ?? null)
        : renderDefaultLeafAside(species, hiddenLabel, visibleLabel)}
    </>
  );
}

function SpeciesTaxonomyLeafRow({
  species,
  displayName,
  secondaryLabel,
  rankLabels,
  noVernacularNameLabel,
  hiddenLabel,
  visibleLabel,
  getLeafEditHref,
  renderLeafAside,
  depth,
  focusNodeId,
  highlightedNodeId,
  highlightQuery,
  onNodeSelect,
  editLeafLabel,
}: {
  species: Species;
  displayName: string;
  secondaryLabel?: string;
  rankLabels: SpeciesTaxonomyTreeProps["rankLabels"];
  noVernacularNameLabel: string;
  hiddenLabel: string;
  visibleLabel: string;
  getLeafEditHref?: SpeciesTaxonomyTreeProps["getLeafEditHref"];
  renderLeafAside?: SpeciesTaxonomyTreeProps["renderLeafAside"];
  depth: number;
  focusNodeId?: SpeciesTaxonomyTreeProps["focusNodeId"];
  highlightedNodeId?: SpeciesTaxonomyTreeProps["highlightedNodeId"];
  highlightQuery?: SpeciesTaxonomyTreeProps["highlightQuery"];
  onNodeSelect?: SpeciesTaxonomyTreeProps["onNodeSelect"];
  editLeafLabel?: SpeciesTaxonomyTreeProps["editLeafLabel"];
}) {
  return (
    <div className="relative">
      {depth > 0 ? (
        <span className="pointer-events-none absolute left-3 top-0 h-full w-px bg-border/60" />
      ) : null}
      <div
        data-taxonomy-node-id={species.id}
        tabIndex={focusNodeId === species.id ? -1 : undefined}
        className={cn(
          "relative z-10 flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-background/90 px-3 py-3 shadow-xs transition-colors hover:bg-accent/40 focus-within:ring-2 focus-within:ring-ring/50",
          depth > 0 ? "ml-6" : "",
          focusNodeId === species.id
            ? "border-primary/35 bg-accent/35 ring-2 ring-ring/35"
            : "",
          highlightedNodeId === species.id
            ? "border-emerald-500/45 bg-emerald-50/80 shadow-sm dark:bg-emerald-950/25"
            : "",
        )}
      >
        <button
          type="button"
          onClick={() => onNodeSelect?.(species.id)}
          className="min-w-0 flex-1 space-y-1 text-left focus-visible:outline-none"
        >
          <div className="flex flex-wrap items-center gap-2">
            <RankBadge rank="species" rankLabels={rankLabels} />
            <span className="font-medium text-foreground">
              {renderHighlightedText(displayName, highlightQuery)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {renderHighlightedText(
              secondaryLabel ?? noVernacularNameLabel,
              highlightQuery,
            )}
          </p>
        </button>

        <div className="flex shrink-0 items-start gap-2">
          <LeafAside
            species={species}
            hiddenLabel={hiddenLabel}
            visibleLabel={visibleLabel}
            renderLeafAside={renderLeafAside}
          />
          <Button
            asChild
            size="icon-sm"
            variant="outline"
            className="rounded-full"
          >
            <Link
              href={
                getLeafEditHref
                  ? getLeafEditHref(species)
                  : `/manage/species/${species.id}`
              }
              aria-label={editLeafLabel}
              title={editLeafLabel}
            >
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function SpeciesTaxonomyBranch({
  node,
  rankLabels,
  noVernacularNameLabel,
  hiddenLabel,
  visibleLabel,
  depth,
  getLeafEditHref,
  renderLeafAside,
  focusNodeId,
  highlightedNodeId,
  highlightQuery,
  onNodeSelect,
  editLeafLabel,
  expandedNodeIds,
}: TaxonomyTreeBranchProps) {
  const isOpen = expandedNodeIds.has(node.id);
  const isHighlighted = highlightedNodeId === node.id;

  return (
    <li className="list-none">
      <Collapsible open={isOpen}>
        <div className="relative">
          {depth > 0 ? (
            <span className="pointer-events-none absolute left-3 top-0 h-full w-px bg-border/60" />
          ) : null}
          <button
            type="button"
            data-taxonomy-node-id={node.id}
            tabIndex={focusNodeId === node.id ? -1 : undefined}
            onClick={() => onNodeSelect?.(node.id)}
            className={cn(
              "group relative z-10 flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/85 px-3 py-3 text-left shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              depth > 0 ? "ml-6" : "",
              isOpen ? "bg-accent/25" : "",
              focusNodeId === node.id
                ? "border-primary/35 bg-accent/35 ring-2 ring-ring/35"
                : "",
              isHighlighted
                ? "border-emerald-500/45 bg-emerald-50/80 shadow-sm dark:bg-emerald-950/25"
                : "",
            )}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 rounded-full bg-background/80 p-1 text-muted-foreground shadow-xs">
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isOpen ? "rotate-90" : "",
                  )}
                />
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <RankBadge rank={node.rank} rankLabels={rankLabels} />
                  <span className="font-medium text-foreground">
                    {renderHighlightedText(node.displayName, highlightQuery)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {renderHighlightedText(
                    node.secondaryLabel ??
                      node.scientificName ??
                      node.displayName,
                    highlightQuery,
                  )}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              {node.speciesCount}
            </span>
          </button>
        </div>

        <CollapsibleContent>
          <ul className="mt-2 space-y-2 pl-3">
            {node.children.map((childNode) =>
              childNode.rank === "species" ? (
                <li key={childNode.id} className="list-none">
                  <SpeciesTaxonomyLeafRow
                    species={childNode.species}
                    displayName={childNode.displayName}
                    secondaryLabel={childNode.secondaryLabel}
                    rankLabels={rankLabels}
                    noVernacularNameLabel={noVernacularNameLabel}
                    hiddenLabel={hiddenLabel}
                    visibleLabel={visibleLabel}
                    getLeafEditHref={getLeafEditHref}
                    renderLeafAside={renderLeafAside}
                    depth={depth + 1}
                    focusNodeId={focusNodeId}
                    highlightedNodeId={highlightedNodeId}
                    highlightQuery={highlightQuery}
                    onNodeSelect={onNodeSelect}
                    editLeafLabel={editLeafLabel}
                  />
                </li>
              ) : (
                <SpeciesTaxonomyBranch
                  key={childNode.id}
                  node={childNode}
                  rankLabels={rankLabels}
                  noVernacularNameLabel={noVernacularNameLabel}
                  hiddenLabel={hiddenLabel}
                  visibleLabel={visibleLabel}
                  depth={depth + 1}
                  getLeafEditHref={getLeafEditHref}
                  renderLeafAside={renderLeafAside}
                  focusNodeId={focusNodeId}
                  highlightedNodeId={highlightedNodeId}
                  highlightQuery={highlightQuery}
                  onNodeSelect={onNodeSelect}
                  editLeafLabel={editLeafLabel}
                  expandedNodeIds={expandedNodeIds}
                />
              ),
            )}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

/** Render canonical species as a fixed-rank, Verdant Scholar-style taxonomy tree. */
export function SpeciesTaxonomyTree({
  nodes,
  rankLabels,
  noVernacularNameLabel,
  hiddenLabel,
  visibleLabel,
  getLeafEditHref,
  renderLeafAside,
  focusNodeId,
  highlightedNodeId,
  highlightQuery,
  autoFocusNode = true,
  onNodeSelect,
  editLeafLabel,
}: SpeciesTaxonomyTreeProps) {
  const expandedNodeIds = useMemo(
    () => new Set(buildExpandedSpeciesTaxonomyNodeIds(nodes, focusNodeId)),
    [focusNodeId, nodes],
  );

  useEffect(() => {
    if (!autoFocusNode || !focusNodeId || typeof document === "undefined") {
      return;
    }

    const target = document.querySelector<HTMLElement>(
      `[data-taxonomy-node-id="${CSS.escape(focusNodeId)}"]`,
    );

    if (!target) {
      return;
    }

    const focusTarget = () => {
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
      target.focus({ preventScroll: true });
    };

    let nestedFrame = 0;
    const frame = requestAnimationFrame(() => {
      nestedFrame = requestAnimationFrame(focusTarget);
    });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(nestedFrame);
    };
  }, [autoFocusNode, focusNodeId, nodes]);

  return (
    <ul className="space-y-3">
      {nodes.map((node) =>
        node.rank === "species" ? (
          <li key={node.id} className="list-none">
            <SpeciesTaxonomyLeafRow
              species={node.species}
              displayName={node.displayName}
              secondaryLabel={node.secondaryLabel}
              rankLabels={rankLabels}
              noVernacularNameLabel={noVernacularNameLabel}
              hiddenLabel={hiddenLabel}
              visibleLabel={visibleLabel}
              getLeafEditHref={getLeafEditHref}
              renderLeafAside={renderLeafAside}
              depth={0}
              focusNodeId={focusNodeId}
              highlightedNodeId={highlightedNodeId}
              highlightQuery={highlightQuery}
              onNodeSelect={onNodeSelect}
              editLeafLabel={editLeafLabel}
            />
          </li>
        ) : (
          <SpeciesTaxonomyBranch
            key={node.id}
            node={node}
            rankLabels={rankLabels}
            noVernacularNameLabel={noVernacularNameLabel}
            hiddenLabel={hiddenLabel}
            visibleLabel={visibleLabel}
            depth={0}
            getLeafEditHref={getLeafEditHref}
            renderLeafAside={renderLeafAside}
            focusNodeId={focusNodeId}
            highlightedNodeId={highlightedNodeId}
            highlightQuery={highlightQuery}
            onNodeSelect={onNodeSelect}
            editLeafLabel={editLeafLabel}
            expandedNodeIds={expandedNodeIds}
          />
        ),
      )}
    </ul>
  );
}
