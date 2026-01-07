import { MiddleEllipsisText } from "@/components/middle-ellipsis-text";
import {
  getLocalizedText,
  type PinkkaSpeciesCard,
} from "@/lib/pinkka/pinkka-api";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";

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
  const vernacular = getLocalizedText(species.vernacularName, preferredLang);
  return (
    <>
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
    </>
  );
}
