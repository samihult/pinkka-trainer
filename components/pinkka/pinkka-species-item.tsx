"use client";

/** Pinkka explorer row for a species card with an import-status indicator from context. */

import { MiddleEllipsisText } from "@/components/middle-ellipsis-text";
import { usePinkkaImportStatusContext } from "@/components/pinkka/pinkka-import-status-context";
import {
  getLocalizedText,
  type PinkkaSpeciesCard,
} from "@/lib/pinkka/pinkka-api";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";

const DEFAULT_STATUS = {
  isImported: false,
  isIncomplete: false,
} as const;

/** Props for rendering a Pinkka species row. */
export interface PinkkaSpeciesItemProps {
  /** Pinkka species card payload to display. */
  species: PinkkaSpeciesCard;
  /** Preferred language for localized fields. */
  preferredLang: PinkkaLanguage;
}

/** Display scientific and vernacular names for a Pinkka species. */
export function PinkkaSpeciesItem({
  species,
  preferredLang,
}: PinkkaSpeciesItemProps) {
  const { selectedStackId, speciesImportStatusesByStack } =
    usePinkkaImportStatusContext();
  const status =
    typeof selectedStackId === "number"
      ? (speciesImportStatusesByStack[selectedStackId]?.[species.id] ??
        DEFAULT_STATUS)
      : DEFAULT_STATUS;
  const vernacular = getLocalizedText(species.vernacularName, preferredLang);

  return (
    <div className="flex items-start gap-2">
      <span
        className={
          status.isIncomplete
            ? "shrink-0 mt-1.5 h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.7)]"
            : status.isImported
              ? "shrink-0 mt-1.5 h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.7)]"
              : "shrink-0 mt-1.5 h-2 w-2 rounded-full bg-transparent"
        }
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <MiddleEllipsisText
          className="font-medium"
          text={species.scientificName}
        />
        {vernacular && (
          <MiddleEllipsisText
            className="text-xs text-muted-foreground"
            text={vernacular}
          />
        )}
      </div>
    </div>
  );
}
