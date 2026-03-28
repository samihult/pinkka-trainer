"use client";

/** Context for propagating Pinkka import-status data without reloading explorer columns. */

import { createContext, useContext, type ReactNode } from "react";
import type { PinkkaImportStatus } from "@/lib/firebase/firestore-helpers";

type PinkkaImportStatusContextValue = {
  /** Incremented when import operations should refresh status dots. */
  version: number;
  /** Currently selected Pinkka group id, if any. */
  selectedGroupId: number | null;
  /** Currently selected Pinkka stack id, if any. */
  selectedStackId: number | null;
  /** Batched group import statuses keyed by Pinkka group id. */
  groupImportStatuses: Record<number, PinkkaImportStatus>;
  /** Batched stack import statuses keyed by Pinkka group id and stack id. */
  stackImportStatusesByGroup: Record<
    number,
    Record<number, PinkkaImportStatus>
  >;
  /** Batched species import statuses keyed by Pinkka stack id and species id. */
  speciesImportStatusesByStack: Record<
    number,
    Record<number, PinkkaImportStatus>
  >;
};

const defaultPinkkaImportStatusContextValue: PinkkaImportStatusContextValue = {
  version: 0,
  selectedGroupId: null,
  selectedStackId: null,
  groupImportStatuses: {},
  stackImportStatusesByGroup: {},
  speciesImportStatusesByStack: {},
};

const PinkkaImportStatusContext = createContext<PinkkaImportStatusContextValue>(
  defaultPinkkaImportStatusContextValue,
);

/** Provide current Pinkka import-status state to explorer row components. */
export function PinkkaImportStatusProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: PinkkaImportStatusContextValue;
}) {
  return (
    <PinkkaImportStatusContext.Provider value={value}>
      {children}
    </PinkkaImportStatusContext.Provider>
  );
}

/** Read the current Pinkka import-status context. */
export function usePinkkaImportStatusContext() {
  return useContext(PinkkaImportStatusContext);
}
