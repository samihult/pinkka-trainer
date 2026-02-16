import type { TestPreferences } from "@/lib/types";

/** Local storage key used for persisted UI preferences. */
export const LOCAL_PREFERENCES_KEY = "localPreferences";
/** Window event emitted after local preferences are updated in the same tab. */
export const LOCAL_PREFERENCES_UPDATED_EVENT = "localPreferencesUpdated";

/** Supported language choices for the UI. */
export const AVAILABLE_LANGUAGES = ["FI", "SV", "EN"] as const;

/** Language preference persisted in local preferences. */
export type LanguagePreference = (typeof AVAILABLE_LANGUAGES)[number];

/** Layout variants for the species management view. */
export type ManageSpeciesViewVariant = "detailed" | "minimal";

/** Preferences for the home page UI. */
export type HomePagePreferences = {
  /** Last expanded group id on the home page. */
  expandedGroupId?: string;
};

/** Shape of locally persisted UI preferences. */
export type LocalPreferences = {
  /** Preferences scoped to species management UI. */
  manageSpecies?: {
    /** Preferred layout for the species list. */
    viewVariant?: ManageSpeciesViewVariant;
  };
  /** Preferences scoped to the home page UI. */
  home?: HomePagePreferences;
  /** Preferences for global UI behavior. */
  ui?: {
    /** Preferred language for UI labels. */
    language?: LanguagePreference;
  };
  /** Preferences for test sessions. */
  test?: TestPreferences;
};

/** Convert a language preference to its lowercase locale code. */
export function toLanguageCode(
  language: LanguagePreference,
): "fi" | "sv" | "en" {
  return language.toLowerCase() as "fi" | "sv" | "en";
}

/** Safely loads local preferences from localStorage. */
export function loadLocalPreferences(): LocalPreferences {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(LOCAL_PREFERENCES_KEY);
    return stored ? (JSON.parse(stored) as LocalPreferences) : {};
  } catch (error) {
    console.warn("Failed to parse local preferences", error);
    return {};
  }
}

/** Saves local preferences to localStorage. */
export function saveLocalPreferences(next: LocalPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_PREFERENCES_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(LOCAL_PREFERENCES_UPDATED_EVENT));
}

/** Updates local preferences with a functional updater. */
export function updateLocalPreferences(
  updater: (current: LocalPreferences) => LocalPreferences,
) {
  if (typeof window === "undefined") return;
  const current = loadLocalPreferences();
  const next = updater(current);
  saveLocalPreferences(next);
}

/** Type guard for validating a stored language value. */
export function isLanguagePreference(
  value: unknown,
): value is LanguagePreference {
  return AVAILABLE_LANGUAGES.includes(value as LanguagePreference);
}

/** Resolve browser language preferences to one of the supported UI languages. */
function getBrowserDefaultLanguage(): LanguagePreference {
  if (typeof navigator === "undefined") return "EN";

  const browserLocales = [...(navigator.languages ?? []), navigator.language]
    .filter(Boolean)
    .map((locale) => locale.toLowerCase());

  for (const locale of browserLocales) {
    if (locale.startsWith("fi")) return "FI";
    if (locale.startsWith("sv")) return "SV";
    if (locale.startsWith("en")) return "EN";
  }

  return "EN";
}

/** Loads the stored language preference or returns the default. */
export function getStoredLanguage(): LanguagePreference {
  const stored = loadLocalPreferences().ui?.language;
  return isLanguagePreference(stored) ? stored : getBrowserDefaultLanguage();
}

/** Persists the provided language preference in local preferences. */
export function setStoredLanguage(next: LanguagePreference) {
  updateLocalPreferences((current) => ({
    ...current,
    ui: {
      ...current.ui,
      language: next,
    },
  }));
}

/** Loads stored test preferences from local preferences. */
export function getStoredTestPreferences(): TestPreferences | null {
  const stored = loadLocalPreferences() as LocalPreferences & {
    quiz?: TestPreferences;
  };
  return stored.test ?? stored.quiz ?? null;
}

/** Persists test preferences in local preferences. */
export function setStoredTestPreferences(next: TestPreferences) {
  updateLocalPreferences((current) => {
    const currentWithLegacy = current as LocalPreferences & {
      quiz?: TestPreferences;
    };
    return {
      ...currentWithLegacy,
      test: next,
      quiz: undefined,
    };
  });
}

/** Loads the stored home page expanded group id, if available. */
export function getStoredHomeExpandedGroupId(): string | null {
  const stored = loadLocalPreferences().home?.expandedGroupId;
  return typeof stored === "string" && stored.length > 0 ? stored : null;
}

/** Persists the expanded group id for the home page. */
export function setStoredHomeExpandedGroupId(next: string | null) {
  updateLocalPreferences((current) => {
    const nextHome: HomePagePreferences = {
      ...current.home,
      expandedGroupId: next ?? undefined,
    };
    const cleanedHome = nextHome.expandedGroupId ? nextHome : undefined;

    return {
      ...current,
      home: cleanedHome,
    };
  });
}
