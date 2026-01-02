// API client for fetching data from the external Pinkka API
// https://fmnh-ws-prod3.it.helsinki.fi/pinkka/

const BASE_URL = "https://fmnh-ws-prod3.it.helsinki.fi/pinkka/api";

export interface MultilingualText {
  fi?: string;
  en?: string;
  sv?: string;
}

export interface PinkkaGroup {
  id: number;
  name: MultilingualText;
  description?: MultilingualText;
  hideScientific: boolean;
  hideVernacular: boolean;
  published: boolean;
  entityType: string;
  subPinkkas?: PinkkaSubStack[];
}

export interface PinkkaSubStack {
  id: number;
  name: MultilingualText;
  orderNo: number;
  description?: MultilingualText;
  imageId?: string;
  entityType: string;
  speciesCards?: PinkkaSpeciesCard[];
  pinkka?: {
    id: number;
    name: MultilingualText;
  };
}

export interface PinkkaSpeciesCard {
  id: number;
  taxonId: string;
  scientificName: string;
  vernacularName?: MultilingualText;
  entityType: string;
}

export interface PinkkaSpeciesDetail {
  taxonId: string;
  scientificName: string;
  vernacularName?: MultilingualText;
  alternativeVernacularNames?: Record<string, any>;
  distributionMapFinland?: string | null;
  description?: Array<{
    title: MultilingualText;
    body: MultilingualText;
    predicate: string;
  }>;
}

export function getLocalizedText(
  text: MultilingualText | string | undefined,
  preferredLang = "fi",
): string {
  if (!text) return "";
  if (typeof text === "string") return text;

  // Try preferred language first
  if (text[preferredLang as keyof MultilingualText]) {
    return text[preferredLang as keyof MultilingualText] || "";
  }

  // Fallback order: fi -> en -> sv -> first available
  return text.fi || text.en || text.sv || Object.values(text)[0] || "";
}

export async function fetchPinkkaGroups(): Promise<PinkkaGroup[]> {
  try {
    const response = await fetch(`${BASE_URL}/pinkkas/`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch groups: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching Pinkka groups:", error);
    return [];
  }
}

export async function fetchPinkkaGroupWithStacks(
  groupId: number,
): Promise<PinkkaGroup | null> {
  try {
    const response = await fetch(`${BASE_URL}/pinkkas/${groupId}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch group ${groupId}: ${response.statusText}`,
      );
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching Pinkka group ${groupId}:`, error);
    return null;
  }
}

export async function fetchPinkkaSubStack(
  subStackId: number,
): Promise<PinkkaSubStack | null> {
  try {
    const response = await fetch(`${BASE_URL}/subpinkkas/${subStackId}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch substack ${subStackId}: ${response.statusText}`,
      );
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching Pinkka substack ${subStackId}:`, error);
    return null;
  }
}

export async function fetchPinkkaSpecies(
  speciesId: number,
): Promise<PinkkaSpeciesDetail | null> {
  try {
    const response = await fetch(`${BASE_URL}/speciescards/${speciesId}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch species ${speciesId}: ${response.statusText}`,
      );
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching Pinkka species ${speciesId}:`, error);
    return null;
  }
}
