import { getLocalizedText } from "@/lib/content/content-display";
import type { Species, SpeciesTaxonomyNode } from "@/lib/types";

/** Fixed taxonomy branch ranks rendered above the species leaf level. */
export const SPECIES_TAXONOMY_BRANCH_RANKS = [
  "domain",
  "kingdom",
  "phylum",
  "class",
  "order",
  "family",
  "genus",
] as const;

/** All taxonomy ranks rendered in the management hierarchy. */
export const SPECIES_TAXONOMY_RANKS = [
  ...SPECIES_TAXONOMY_BRANCH_RANKS,
  "species",
] as const;

/** Branch ranks in the fixed species taxonomy hierarchy. */
export type SpeciesTaxonomyBranchRank =
  (typeof SPECIES_TAXONOMY_BRANCH_RANKS)[number];

/** Supported ranks in the fixed species taxonomy hierarchy. */
export type SpeciesTaxonomyRank = (typeof SPECIES_TAXONOMY_RANKS)[number];

/** Branch node rendered in the species taxonomy hierarchy. */
export interface SpeciesTaxonomyBranchNode {
  /** Stable node id derived from rank path metadata. */
  id: string;
  /** Non-species taxonomy rank for the branch. */
  rank: SpeciesTaxonomyBranchRank;
  /** Primary label shown for the branch. */
  displayName: string;
  /** Scientific name used for sorting when available. */
  scientificName?: string;
  /** Optional secondary label, usually a localized common name. */
  secondaryLabel?: string;
  /** Total descendant species count. */
  speciesCount: number;
  /** Whether the branch should start expanded. */
  defaultExpanded: boolean;
  /** Descendant branch or species nodes. */
  children: SpeciesTaxonomyTreeNode[];
}

/** Leaf node rendered for one canonical species entry. */
export interface SpeciesTaxonomyLeafNode {
  /** Stable node id matching the canonical species document id. */
  id: string;
  /** Leaf rank discriminator. */
  rank: "species";
  /** Canonical species document rendered by the leaf. */
  species: Species;
  /** Primary label shown for the leaf. */
  displayName: string;
  /** Scientific name used for sorting. */
  scientificName: string;
  /** Optional localized common-name label. */
  secondaryLabel?: string;
}

/** Tree node rendered in the canonical species taxonomy hierarchy. */
export type SpeciesTaxonomyTreeNode =
  | SpeciesTaxonomyBranchNode
  | SpeciesTaxonomyLeafNode;

/** Parameters for building the fixed-rank taxonomy hierarchy. */
export interface BuildSpeciesTaxonomyTreeParams {
  /** Canonical species documents to arrange into the hierarchy. */
  species: Species[];
  /** Preferred language used for localized common names. */
  preferredLanguage: "fi" | "en" | "sv";
  /** Returns the localized fallback label when a rank is missing. */
  getUnclassifiedLabel: (rank: SpeciesTaxonomyBranchRank) => string;
  /** Optional node id that should start expanded and focused. */
  focusedNodeId?: string;
}

/** One node path from the hierarchy root to a selected branch or species leaf. */
export type SpeciesTaxonomyNodePath = SpeciesTaxonomyTreeNode[];

interface RankDescriptor {
  /** Stable key segment for the node path. */
  key: string;
  /** Preferred display label for the node. */
  displayName: string;
  /** Scientific label for sorting when available. */
  scientificName?: string;
  /** Optional localized secondary label. */
  secondaryLabel?: string;
}

interface InternalBranchNode {
  /** Stable node id derived from rank path metadata. */
  id: string;
  /** Branch rank. */
  rank: SpeciesTaxonomyBranchRank;
  /** Preferred display label. */
  displayName: string;
  /** Scientific label for sorting when available. */
  scientificName?: string;
  /** Optional secondary label. */
  secondaryLabel?: string;
  /** Total descendant species count. */
  speciesCount: number;
  /** Mutable child map used while constructing the hierarchy. */
  children: Map<string, InternalHierarchyNode>;
}

type InternalHierarchyNode = InternalBranchNode | SpeciesTaxonomyLeafNode;

const SOURCE_RANK_BY_BRANCH: Record<SpeciesTaxonomyBranchRank, string> = {
  domain: "MX.domain",
  kingdom: "MX.kingdom",
  phylum: "MX.phylum",
  class: "MX.class",
  order: "MX.order",
  family: "MX.family",
  genus: "MX.genus",
};

function getTaxonomyEntryByRank(
  taxonomy: Species["data"]["taxonomy"],
  rank: SpeciesTaxonomyBranchRank,
): SpeciesTaxonomyNode | undefined {
  const sourceRank = SOURCE_RANK_BY_BRANCH[rank];
  return taxonomy?.find((entry) => entry.rank === sourceRank);
}

function getFallbackTaxonomyLabels(
  species: Species,
  rank: SpeciesTaxonomyBranchRank,
): { scientificName?: string } {
  if (rank === "family") {
    return {
      scientificName: species.data.familyScientificName,
    };
  }

  if (rank === "genus") {
    return {
      scientificName: species.data.genusScientificName,
    };
  }

  return {};
}

function getLocalizedFallbackSecondaryLabel(
  species: Species,
  rank: SpeciesTaxonomyBranchRank,
  preferredLanguage: "fi" | "en" | "sv",
): string | undefined {
  if (rank === "family") {
    return getLocalizedText(
      species.data.familyVernacularName,
      preferredLanguage,
    );
  }

  if (rank === "genus") {
    return getLocalizedText(
      species.data.genusVernacularName,
      preferredLanguage,
    );
  }

  return undefined;
}

function createRankDescriptor(params: {
  species: Species;
  rank: SpeciesTaxonomyBranchRank;
  preferredLanguage: "fi" | "en" | "sv";
  getUnclassifiedLabel: BuildSpeciesTaxonomyTreeParams["getUnclassifiedLabel"];
}): RankDescriptor {
  const taxonomyEntry = getTaxonomyEntryByRank(
    params.species.data.taxonomy,
    params.rank,
  );
  const fallbackLabels = getFallbackTaxonomyLabels(params.species, params.rank);
  const scientificName =
    taxonomyEntry?.scientificName ?? fallbackLabels.scientificName;
  const localizedSecondaryLabel =
    getLocalizedText(
      taxonomyEntry?.vernacularName ?? undefined,
      params.preferredLanguage,
    ) ||
    getLocalizedFallbackSecondaryLabel(
      params.species,
      params.rank,
      params.preferredLanguage,
    );
  const displayName =
    scientificName || params.getUnclassifiedLabel(params.rank);
  const secondaryLabel =
    localizedSecondaryLabel && localizedSecondaryLabel !== displayName
      ? localizedSecondaryLabel
      : undefined;

  return {
    key:
      taxonomyEntry?.taxonId || scientificName || `unclassified-${params.rank}`,
    displayName,
    ...(scientificName ? { scientificName } : {}),
    ...(secondaryLabel ? { secondaryLabel } : {}),
  };
}

function createLeafNode(
  species: Species,
  preferredLanguage: "fi" | "en" | "sv",
): SpeciesTaxonomyLeafNode {
  const secondaryLabel = getLocalizedText(
    species.data.vernacularName,
    preferredLanguage,
  );

  return {
    id: species.id,
    rank: "species",
    species,
    displayName: species.data.scientificName,
    scientificName: species.data.scientificName,
    ...(secondaryLabel && secondaryLabel !== species.data.scientificName
      ? { secondaryLabel }
      : {}),
  };
}

function sortHierarchyNodes(
  left: InternalHierarchyNode,
  right: InternalHierarchyNode,
): number {
  const leftIsBranch = "children" in left;
  const rightIsBranch = "children" in right;

  if (leftIsBranch !== rightIsBranch) {
    return leftIsBranch ? -1 : 1;
  }

  const leftLabel =
    left.scientificName?.toLocaleLowerCase() ||
    left.displayName.toLocaleLowerCase();
  const rightLabel =
    right.scientificName?.toLocaleLowerCase() ||
    right.displayName.toLocaleLowerCase();

  return leftLabel.localeCompare(rightLabel);
}

function nodeContainsFocusTarget(
  node: SpeciesTaxonomyTreeNode,
  focusedNodeId?: string,
): boolean {
  if (!focusedNodeId) {
    return false;
  }

  if (node.id === focusedNodeId) {
    return true;
  }

  if ("children" in node) {
    return node.children.some((child) =>
      nodeContainsFocusTarget(child, focusedNodeId),
    );
  }

  return false;
}

function findSpeciesTaxonomyNodePathInternal(
  nodes: SpeciesTaxonomyTreeNode[],
  targetNodeId: string,
): SpeciesTaxonomyNodePath | null {
  for (const node of nodes) {
    if (node.id === targetNodeId) {
      return [node];
    }

    if ("children" in node) {
      const childPath = findSpeciesTaxonomyNodePathInternal(
        node.children,
        targetNodeId,
      );
      if (childPath) {
        return [node, ...childPath];
      }
    }
  }

  return null;
}

/** Find the root-to-target path for a taxonomy node id when it exists. */
export function findSpeciesTaxonomyNodePath(
  nodes: SpeciesTaxonomyTreeNode[],
  targetNodeId?: string,
): SpeciesTaxonomyNodePath | null {
  if (!targetNodeId) {
    return null;
  }

  return findSpeciesTaxonomyNodePathInternal(nodes, targetNodeId);
}

/**
 * Build the branch ids that should stay expanded for a selected taxonomy node.
 * Expands the selected node's ancestors and auto-cascades through single-child
 * branches so users do not have to open forced one-option steps manually.
 */
export function buildExpandedSpeciesTaxonomyNodeIds(
  nodes: SpeciesTaxonomyTreeNode[],
  targetNodeId?: string,
): string[] {
  const path = findSpeciesTaxonomyNodePath(nodes, targetNodeId);
  if (!path) {
    return [];
  }

  const expandedIds = path
    .filter(
      (node): node is SpeciesTaxonomyBranchNode =>
        node.rank !== "species" && "children" in node,
    )
    .map((node) => node.id);

  let currentNode = path[path.length - 1];
  while ("children" in currentNode && currentNode.children.length === 1) {
    const onlyChild = currentNode.children[0];
    if (!("children" in onlyChild)) {
      break;
    }
    expandedIds.push(onlyChild.id);
    currentNode = onlyChild;
  }

  return [...new Set(expandedIds)];
}

function finalizeBranch(
  branch: InternalBranchNode,
  focusedNodeId?: string,
): SpeciesTaxonomyBranchNode {
  const children = [...branch.children.values()]
    .sort(sortHierarchyNodes)
    .map((child) =>
      "children" in child ? finalizeBranch(child, focusedNodeId) : child,
    );

  return {
    id: branch.id,
    rank: branch.rank,
    displayName: branch.displayName,
    ...(branch.scientificName ? { scientificName: branch.scientificName } : {}),
    ...(branch.secondaryLabel ? { secondaryLabel: branch.secondaryLabel } : {}),
    speciesCount: branch.speciesCount,
    defaultExpanded:
      focusedNodeId !== undefined &&
      (branch.id === focusedNodeId ||
        children.some((child) =>
          nodeContainsFocusTarget(child, focusedNodeId),
        )),
    children,
  };
}

/** Build a fixed-rank taxonomy tree for the canonical species inventory page. */
export function buildSpeciesTaxonomyTree(
  params: BuildSpeciesTaxonomyTreeParams,
): SpeciesTaxonomyTreeNode[] {
  const rootNodes = new Map<string, InternalHierarchyNode>();

  for (const species of params.species) {
    let currentChildren = rootNodes;
    const pathParts: string[] = [];

    for (const rank of SPECIES_TAXONOMY_BRANCH_RANKS) {
      const descriptor = createRankDescriptor({
        species,
        rank,
        preferredLanguage: params.preferredLanguage,
        getUnclassifiedLabel: params.getUnclassifiedLabel,
      });
      const nodeKey = `${rank}:${descriptor.key}`;
      pathParts.push(nodeKey);

      const existingNode = currentChildren.get(nodeKey);
      if (existingNode && "children" in existingNode) {
        existingNode.speciesCount += 1;
        currentChildren = existingNode.children;
        continue;
      }

      const nextNode: InternalBranchNode = {
        id: pathParts.join("/"),
        rank,
        displayName: descriptor.displayName,
        ...(descriptor.scientificName
          ? { scientificName: descriptor.scientificName }
          : {}),
        ...(descriptor.secondaryLabel
          ? { secondaryLabel: descriptor.secondaryLabel }
          : {}),
        speciesCount: 1,
        children: new Map<string, InternalHierarchyNode>(),
      };
      currentChildren.set(nodeKey, nextNode);
      currentChildren = nextNode.children;
    }

    currentChildren.set(
      `species:${species.id}`,
      createLeafNode(species, params.preferredLanguage),
    );
  }

  return [...rootNodes.values()]
    .sort(sortHierarchyNodes)
    .map((node) =>
      "children" in node ? finalizeBranch(node, params.focusedNodeId) : node,
    );
}
