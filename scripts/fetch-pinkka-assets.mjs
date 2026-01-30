import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://fmnh-ws-prod3.it.helsinki.fi/pinkka/api";
const OUTPUT_DIR = path.resolve("test-assets/pinkka");
const GROUP_LIMIT = 3;
const SUBSTACK_LIMIT = 2;
const SPECIES_LIMIT = 2;

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.statusText}`);
  }
  return response.json();
}

function toFilename(prefix, id) {
  return `${prefix}-${id}.json`;
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const groups = await fetchJson(`${BASE_URL}/pinkkas/`);
  await writeFile(
    path.join(OUTPUT_DIR, "pinkkas.json"),
    JSON.stringify(groups, null, 2),
  );

  const selectedGroups = groups.slice(0, GROUP_LIMIT);
  const groupsById = {};
  const subStacksById = {};
  const speciesById = {};

  for (const group of selectedGroups) {
    const groupDetail = await fetchJson(`${BASE_URL}/pinkkas/${group.id}`);
    groupsById[group.id] = groupDetail;
    await writeFile(
      path.join(OUTPUT_DIR, toFilename("pinkka", group.id)),
      JSON.stringify(groupDetail, null, 2),
    );

    const subStacks = (groupDetail.subPinkkas ?? []).slice(0, SUBSTACK_LIMIT);
    for (const subStack of subStacks) {
      const subStackDetail = await fetchJson(
        `${BASE_URL}/subpinkkas/${subStack.id}`,
      );
      subStacksById[subStack.id] = subStackDetail;
      await writeFile(
        path.join(OUTPUT_DIR, toFilename("subpinkka", subStack.id)),
        JSON.stringify(subStackDetail, null, 2),
      );

      const speciesCards = (subStackDetail.speciesCards ?? []).slice(
        0,
        SPECIES_LIMIT,
      );
      for (const species of speciesCards) {
        const speciesDetail = await fetchJson(
          `${BASE_URL}/speciescards/${species.id}`,
        );
        speciesById[species.id] = speciesDetail;
        await writeFile(
          path.join(OUTPUT_DIR, toFilename("speciescard", species.id)),
          JSON.stringify(speciesDetail, null, 2),
        );
      }
    }
  }

  const mockData = {
    groups,
    selectedGroupIds: selectedGroups.map((group) => group.id),
    groupsById,
    subStacksById,
    speciesById,
  };

  await writeFile(
    path.join(OUTPUT_DIR, "mock-data.json"),
    JSON.stringify(mockData, null, 2),
  );

  console.log("Saved Pinkka mock data to", OUTPUT_DIR);
  console.log("Groups:", mockData.selectedGroupIds.join(", "));
  console.log("Substacks:", Object.keys(subStacksById).join(", "));
  console.log("Species:", Object.keys(speciesById).join(", "));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
