import { MiddleEllipsisText } from "@/components/middle-ellipsis-text";
import {
  getLocalizedText,
  type PinkkaSubStack,
} from "@/lib/pinkka/pinkka-api";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";

/** Props for rendering a Pinkka stack row. */
export interface PinkkaStackItemProps {
  /** Pinkka stack payload to display. */
  stack: PinkkaSubStack;
  /** Preferred language for localized fields. */
  preferredLang: PinkkaLanguage;
}

/** Display label and description for a Pinkka stack item. */
export function PinkkaStackItem({
  stack,
  preferredLang,
}: PinkkaStackItemProps) {
  const label = getLocalizedText(stack.name, preferredLang);
  const description = getLocalizedText(stack.description, preferredLang);
  return (
    <>
      <MiddleEllipsisText
        className="font-medium"
        text={label || `Stack ${stack.id}`}
      />
      <div className="text-xs text-muted-foreground">{description}</div>
    </>
  );
}
