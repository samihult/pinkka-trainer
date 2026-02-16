"use client";

import type React from "react";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import {
  getStoredLanguage,
  LOCAL_PREFERENCES_KEY,
  LOCAL_PREFERENCES_UPDATED_EVENT,
  setStoredLanguage,
  type LanguagePreference,
} from "@/lib/local-preferences";

/** Context value for the current UI language preference. */
interface LanguageContextValue {
  /** Selected language preference. */
  language: LanguagePreference;
  /** Update the selected language preference. */
  setLanguage: (next: LanguagePreference) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

/** Provides the UI language preference to the application tree. */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== LOCAL_PREFERENCES_KEY) return;
      onStoreChange();
    };
    const handleLocalUpdate = () => {
      onStoreChange();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      LOCAL_PREFERENCES_UPDATED_EVENT,
      handleLocalUpdate,
    );
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        LOCAL_PREFERENCES_UPDATED_EVENT,
        handleLocalUpdate,
      );
    };
  }, []);

  const getSnapshot = useCallback(() => getStoredLanguage(), []);
  const getServerSnapshot = useCallback<() => LanguagePreference>(
    () => "EN",
    [],
  );
  const language = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setLanguage = useCallback((next: LanguagePreference) => {
    setStoredLanguage(next);
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
    }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Access the current UI language preference. */
export function useLanguagePreference() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error(
      "useLanguagePreference must be used within a LanguageProvider",
    );
  }
  return context;
}
