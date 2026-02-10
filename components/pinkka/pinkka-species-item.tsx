"use client";

import { useEffect, useState } from "react";
import { MiddleEllipsisText } from "@/components/middle-ellipsis-text";
import { isPinkkaSpeciesImported } from "@/lib/firebase/firestore-helpers";
import {
  getLocalizedText,
  type PinkkaSpeciesCard,
} from "@/lib/pinkka/pinkka-api";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";

/** Props for rendering a Pinkka species row. */
export interface PinkkaSpeciesItemProps {
  /** Pinkka species card payload to display. */
  species: PinkkaSpeciesCard;
  /** Optional selected parent group id. */
  groupId?: number | null;
  /** Optional selected parent stack id. */
  stackId?: number | null;
  /** Preferred language for localized fields. */
  preferredLang: PinkkaLanguage;
  /** Optional version to refresh import status indicators. */
  importStatusVersion?: number;
}

/** Display scientific and vernacular names for a Pinkka species. */
export function PinkkaSpeciesItem({
  species,
  groupId,
  stackId,
  preferredLang,
  importStatusVersion,
}: PinkkaSpeciesItemProps) {
  const vernacular = getLocalizedText(species.vernacularName, preferredLang);
  const [isImported, setIsImported] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void isPinkkaSpeciesImported(species.id, {
      groupId: groupId ?? undefined,
      stackId: stackId ?? undefined,
    }).then((imported) => {
      if (!isMounted) return;
      setIsImported(imported);
    });
    return () => {
      isMounted = false;
    };
  }, [groupId, importStatusVersion, species.id, stackId]);

  return (
    <div className="flex items-start gap-2">
      <span
        className={
          isImported
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
