import sanitizeHtml from "sanitize-html";
import {
  getLocalizedText,
  type PinkkaSpeciesDetail,
} from "@/lib/pinkka/pinkka-api";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";

/** Props for rendering a Pinkka species detail panel. */
export interface PinkkaSpeciesDetailProps {
  /** Pinkka species detail payload to display. */
  detail: PinkkaSpeciesDetail;
  /** Preferred language for localized fields. */
  preferredLang: PinkkaLanguage;
}

/** Detailed description view for a Pinkka species. */
export function PinkkaSpeciesDetail({
  detail,
  preferredLang,
}: PinkkaSpeciesDetailProps) {
  return (
    <div className="space-y-4 px-1 text-sm">
      <div>
        <div className="text-lg font-semibold">{detail.scientificName}</div>
        <div className="text-muted-foreground">
          {getLocalizedText(detail.vernacularName, preferredLang)}
        </div>
      </div>
      {detail.description?.map((section) => (
        <div key={section.predicate} className="space-y-1">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            {getLocalizedText(section.title, preferredLang)}
          </div>
          <div
            className="text-sm text-foreground"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(
                getLocalizedText(section.body, preferredLang) ?? "",
              ),
            }}
          />
        </div>
      ))}
      {!detail.description?.length && (
        <div className="text-muted-foreground">
          No description available for this species.
        </div>
      )}
    </div>
  );
}
