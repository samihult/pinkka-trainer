// API client for fetching data from the external Pinkka API
// https://fmnh-ws-prod3.it.helsinki.fi/pinkka/

const BASE_URL = "https://fmnh-ws-prod3.it.helsinki.fi/pinkka/api";

/** Localized text map keyed by language code. */
export interface MultilingualText {
  /** Finnish translation. */
  fi?: string;
  /** English translation. */
  en?: string;
  /** Swedish translation. */
  sv?: string;
}

/** Pinkka group with optional sub-stacks. */
export interface PinkkaGroup {
  /** Group id. */
  id: number;
  /** Localized group name. */
  name: MultilingualText;
  /** Optional localized description. */
  description?: MultilingualText;
  /** Whether scientific names are hidden. */
  hideScientific: boolean;
  /** Whether vernacular names are hidden. */
  hideVernacular: boolean;
  /** Publication status. */
  published: boolean;
  /** Entity type identifier. */
  entityType: string;
  /** Optional child stacks. */
  subPinkkas?: PinkkaSubStack[];
}

/** Pinkka sub-stack (subpinkka) metadata. */
export interface PinkkaSubStack {
  /** Sub-stack id. */
  id: number;
  /** Localized sub-stack name. */
  name: MultilingualText;
  /** Sort order within the group. */
  orderNo: number;
  /** Optional localized description. */
  description?: MultilingualText;
  /** Optional cover image id. */
  imageId?: string;
  /** Entity type identifier. */
  entityType: string;
  /** Optional species cards under this stack. */
  speciesCards?: PinkkaSpeciesCard[];
  /** Optional parent group summary. */
  pinkka?: {
    /** Group id. */
    id: number;
    /** Localized group name. */
    name: MultilingualText;
  };
}

/** Lightweight species card metadata. */
export interface PinkkaSpeciesCard {
  /** Species card id. */
  id: number;
  /** Taxonomy id for the species. */
  taxonId: string;
  /** Scientific name. */
  scientificName: string;
  /** Optional localized common names. */
  vernacularName?: MultilingualText;
  /** Entity type identifier. */
  entityType: string;
}

/** Detailed species card response. */
export interface PinkkaSpeciesDetail {
  /** Taxonomy id for the species. */
  taxonId: string;
  /** Scientific name. */
  scientificName: string;
  /** Optional localized common names. */
  vernacularName?: MultilingualText;
  /** Alternative vernacular names keyed by locale. */
  alternativeVernacularNames?: Record<string, any>;
  /** Optional distribution map for Finland. */
  distributionMapFinland?: string | null;
  /** Descriptive sections for the species. */
  description?: Array<{
    /** Localized section title. */
    title: MultilingualText;
    /** Localized section body. */
    body: MultilingualText;
    /** Predicate identifier for the section. */
    predicate: string;
  }>;
  /** Optional image gallery for the species. */
  images?: Array<{
    /** Image id. */
    id: string;
    /** Optional localized image caption. */
    caption?: MultilingualText;
    /** Optional taxonomy id for the image. */
    taxonId?: string | null;
    /** Image URLs at various sizes. */
    urls?: {
      /** Original image URL. */
      original?: string;
      /** Full-size image URL. */
      full?: string;
      /** Large image URL. */
      large?: string;
      /** Square-cropped image URL. */
      square?: string;
      /** Thumbnail image URL. */
      thumbnail?: string;
    };
    /** Optional metadata about the image. */
    meta?: {
      /** Rights owner for the image. */
      rightsOwner?: string;
      /** Capturers/photographers for the image. */
      capturers?: string[];
      /** License identifier for the image. */
      license?: string;
    };
  }>;
}

/** Resolve localized text with preferred language fallback. */
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

/** Fetch the list of Pinkka groups. */
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

/** Fetch a Pinkka group and its stacks. */
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

/** Fetch a sub-stack and its species cards. */
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

/** Fetch species detail for a card id. */
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
