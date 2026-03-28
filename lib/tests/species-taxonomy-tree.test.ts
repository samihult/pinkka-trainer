/** Tests for the canonical species taxonomy hierarchy builder. */

import {
  buildExpandedSpeciesTaxonomyNodeIds,
  buildSpeciesTaxonomyTree,
  type SpeciesTaxonomyBranchNode,
} from "@/lib/content/species-taxonomy-tree";
import type { Species } from "@/lib/types";

function createSpecies(overrides: Partial<Species>): Species {
  return {
    id: overrides.id ?? "species-id",
    data: {
      taxonId: overrides.data?.taxonId ?? "taxon-id",
      scientificName:
        overrides.data?.scientificName ?? "Species scientific name",
      ...(overrides.data?.genusScientificName
        ? { genusScientificName: overrides.data.genusScientificName }
        : {}),
      ...(overrides.data?.familyScientificName
        ? { familyScientificName: overrides.data.familyScientificName }
        : {}),
      ...(overrides.data?.vernacularName
        ? { vernacularName: overrides.data.vernacularName }
        : {}),
      ...(overrides.data?.taxonomy
        ? { taxonomy: overrides.data.taxonomy }
        : {}),
    },
    ownerId: overrides.ownerId ?? "owner-1",
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T00:00:00Z"),
    ...(typeof overrides.isHidden === "boolean"
      ? { isHidden: overrides.isHidden }
      : {}),
  };
}

function getFirstBranch(node: unknown): SpeciesTaxonomyBranchNode {
  return node as SpeciesTaxonomyBranchNode;
}

describe("buildSpeciesTaxonomyTree", () => {
  it("builds a fixed-rank taxonomy hierarchy with sorted species leaves", () => {
    const eagle = createSpecies({
      id: "eagle",
      data: {
        taxonId: "aquila-chrysaetos",
        scientificName: "Aquila chrysaetos",
        vernacularName: { en: "Golden eagle" },
        taxonomy: [
          { taxonId: "1", scientificName: "Eukaryota", rank: "MX.domain" },
          { taxonId: "2", scientificName: "Animalia", rank: "MX.kingdom" },
          { taxonId: "3", scientificName: "Chordata", rank: "MX.phylum" },
          { taxonId: "4", scientificName: "Aves", rank: "MX.class" },
          {
            taxonId: "5",
            scientificName: "Accipitriformes",
            rank: "MX.order",
          },
          {
            taxonId: "6",
            scientificName: "Accipitridae",
            rank: "MX.family",
          },
          { taxonId: "7", scientificName: "Aquila", rank: "MX.genus" },
        ],
      },
    });
    const hawk = createSpecies({
      id: "hawk",
      data: {
        taxonId: "aquila-pomarina",
        scientificName: "Aquila pomarina",
        vernacularName: { en: "Lesser spotted eagle" },
        taxonomy: eagle.data.taxonomy,
      },
      isHidden: true,
    });

    const tree = buildSpeciesTaxonomyTree({
      species: [hawk, eagle],
      preferredLanguage: "en",
      getUnclassifiedLabel: (rank) => `Unclassified ${rank}`,
    });

    const domain = getFirstBranch(tree[0]);
    const kingdom = getFirstBranch(domain.children[0]);
    const phylum = getFirstBranch(kingdom.children[0]);
    const classNode = getFirstBranch(phylum.children[0]);
    const order = getFirstBranch(classNode.children[0]);
    const family = getFirstBranch(order.children[0]);
    const genus = getFirstBranch(family.children[0]);

    expect(domain.displayName).toBe("Eukaryota");
    expect(domain.defaultExpanded).toBe(false);
    expect(genus.displayName).toBe("Aquila");
    expect(genus.speciesCount).toBe(2);
    expect(genus.children.map((child) => child.displayName)).toEqual([
      "Aquila chrysaetos",
      "Aquila pomarina",
    ]);
  });

  it("fills missing upper ranks with localized unclassified labels", () => {
    const fox = createSpecies({
      id: "fox",
      data: {
        taxonId: "vulpes-vulpes",
        scientificName: "Vulpes vulpes",
        genusScientificName: "Vulpes",
        familyScientificName: "Canidae",
        vernacularName: { en: "Red fox" },
      },
    });

    const tree = buildSpeciesTaxonomyTree({
      species: [fox],
      preferredLanguage: "en",
      getUnclassifiedLabel: (rank) => `Unclassified ${rank}`,
    });

    const domain = getFirstBranch(tree[0]);
    const kingdom = getFirstBranch(domain.children[0]);
    const phylum = getFirstBranch(kingdom.children[0]);
    const classNode = getFirstBranch(phylum.children[0]);
    const order = getFirstBranch(classNode.children[0]);
    const family = getFirstBranch(order.children[0]);
    const genus = getFirstBranch(family.children[0]);

    expect(domain.displayName).toBe("Unclassified domain");
    expect(order.displayName).toBe("Unclassified order");
    expect(family.displayName).toBe("Canidae");
    expect(genus.displayName).toBe("Vulpes");
    expect(genus.children[0].displayName).toBe("Vulpes vulpes");
  });

  it("expands the ancestor chain for the focused taxonomy node", () => {
    const eagle = createSpecies({
      id: "eagle",
      data: {
        taxonId: "aquila-chrysaetos",
        scientificName: "Aquila chrysaetos",
        taxonomy: [
          { taxonId: "1", scientificName: "Eukaryota", rank: "MX.domain" },
          { taxonId: "2", scientificName: "Animalia", rank: "MX.kingdom" },
          { taxonId: "3", scientificName: "Chordata", rank: "MX.phylum" },
          { taxonId: "4", scientificName: "Aves", rank: "MX.class" },
          {
            taxonId: "5",
            scientificName: "Accipitriformes",
            rank: "MX.order",
          },
          {
            taxonId: "6",
            scientificName: "Accipitridae",
            rank: "MX.family",
          },
          { taxonId: "7", scientificName: "Aquila", rank: "MX.genus" },
        ],
      },
    });

    const tree = buildSpeciesTaxonomyTree({
      species: [eagle],
      preferredLanguage: "en",
      focusedNodeId:
        "domain:1/kingdom:2/phylum:3/class:4/order:5/family:6/genus:7",
      getUnclassifiedLabel: (rank) => `Unclassified ${rank}`,
    });

    const domain = getFirstBranch(tree[0]);
    const kingdom = getFirstBranch(domain.children[0]);
    const phylum = getFirstBranch(kingdom.children[0]);
    const classNode = getFirstBranch(phylum.children[0]);
    const order = getFirstBranch(classNode.children[0]);
    const family = getFirstBranch(order.children[0]);
    const genus = getFirstBranch(family.children[0]);

    expect(domain.defaultExpanded).toBe(true);
    expect(kingdom.defaultExpanded).toBe(true);
    expect(phylum.defaultExpanded).toBe(true);
    expect(classNode.defaultExpanded).toBe(true);
    expect(order.defaultExpanded).toBe(true);
    expect(family.defaultExpanded).toBe(true);
    expect(genus.defaultExpanded).toBe(true);
  });

  it("builds one open branch path and cascades through single-child descendants", () => {
    const eagle = createSpecies({
      id: "eagle",
      data: {
        taxonId: "aquila-chrysaetos",
        scientificName: "Aquila chrysaetos",
        taxonomy: [
          { taxonId: "1", scientificName: "Eukaryota", rank: "MX.domain" },
          { taxonId: "2", scientificName: "Animalia", rank: "MX.kingdom" },
          { taxonId: "3", scientificName: "Chordata", rank: "MX.phylum" },
          { taxonId: "4", scientificName: "Aves", rank: "MX.class" },
          {
            taxonId: "5",
            scientificName: "Accipitriformes",
            rank: "MX.order",
          },
          {
            taxonId: "6",
            scientificName: "Accipitridae",
            rank: "MX.family",
          },
          { taxonId: "7", scientificName: "Aquila", rank: "MX.genus" },
        ],
      },
    });

    const tree = buildSpeciesTaxonomyTree({
      species: [eagle],
      preferredLanguage: "en",
      getUnclassifiedLabel: (rank) => `Unclassified ${rank}`,
    });

    expect(
      buildExpandedSpeciesTaxonomyNodeIds(
        tree,
        "domain:1/kingdom:2/phylum:3/class:4",
      ),
    ).toEqual([
      "domain:1",
      "domain:1/kingdom:2",
      "domain:1/kingdom:2/phylum:3",
      "domain:1/kingdom:2/phylum:3/class:4",
      "domain:1/kingdom:2/phylum:3/class:4/order:5",
      "domain:1/kingdom:2/phylum:3/class:4/order:5/family:6",
      "domain:1/kingdom:2/phylum:3/class:4/order:5/family:6/genus:7",
    ]);
  });
});
