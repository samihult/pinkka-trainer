import type { QuizPreferences } from "@/lib/types";

/** Local storage key used for persisted UI preferences. */
export const LOCAL_PREFERENCES_KEY = "localPreferences";

/** Supported language choices for the UI. */
export const AVAILABLE_LANGUAGES = ["FI", "SV", "EN"] as const;

/** Language preference persisted in local preferences. */
export type LanguagePreference = (typeof AVAILABLE_LANGUAGES)[number];

/** Layout variants for the species management view. */
export type ManageSpeciesViewVariant = "detailed" | "minimal";

/** Shape of locally persisted UI preferences. */
export type LocalPreferences = {
  /** Preferences scoped to species management UI. */
  manageSpecies?: {
    /** Preferred layout for the species list. */
    viewVariant?: ManageSpeciesViewVariant;
  };
  /** Preferences for global UI behavior. */
  ui?: {
    /** Preferred language for UI labels. */
    language?: LanguagePreference;
  };
  /** Preferences for quiz sessions. */
  quiz?: QuizPreferences;
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
  window.localStorage.setItem(
    LOCAL_PREFERENCES_KEY,
    JSON.stringify(next),
  );
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

/** Loads the stored language preference or returns the default. */
export function getStoredLanguage(): LanguagePreference {
  const stored = loadLocalPreferences().ui?.language;
  return isLanguagePreference(stored) ? stored : "EN";
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

/** Loads stored quiz preferences from local preferences. */
export function getStoredQuizPreferences(): QuizPreferences | null {
  return loadLocalPreferences().quiz ?? null;
}

/** Persists quiz preferences in local preferences. */
export function setStoredQuizPreferences(next: QuizPreferences) {
  updateLocalPreferences((current) => ({
    ...current,
    quiz: next,
  }));
}
