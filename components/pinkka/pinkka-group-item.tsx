import { MiddleEllipsisText } from "@/components/middle-ellipsis-text";
import { getLocalizedText, type PinkkaGroup } from "@/lib/pinkka/pinkka-api";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";

/** Props for rendering a Pinkka group row. */
export interface PinkkaGroupItemProps {
  /** Pinkka group payload to display. */
  group: PinkkaGroup;
  /** Preferred language for localized fields. */
  preferredLang: PinkkaLanguage;
}

/** Display label for a Pinkka group item. */
export function PinkkaGroupItem({
  group,
  preferredLang,
}: PinkkaGroupItemProps) {
  const label = getLocalizedText(group.name, preferredLang);
  return (
    <MiddleEllipsisText
      className="font-medium"
      text={label || `Group ${group.id}`}
    />
  );
}
