"use client";

import type React from "react";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getStoredLanguage,
  LOCAL_PREFERENCES_KEY,
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
  const [language, setLanguageState] = useState<LanguagePreference>("EN");

  useEffect(() => {
    setLanguageState(getStoredLanguage());
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LOCAL_PREFERENCES_KEY) return;
      setLanguageState(getStoredLanguage());
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setLanguage = (next: LanguagePreference) => {
    setLanguageState(next);
    setStoredLanguage(next);
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
    }),
    [language],
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
