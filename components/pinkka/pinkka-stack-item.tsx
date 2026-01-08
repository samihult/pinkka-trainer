"use client";

import { useEffect, useState } from "react";
import { MiddleEllipsisText } from "@/components/middle-ellipsis-text";
import { isPinkkaStackImported } from "@/lib/firebase/firestore-helpers";
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
  /** Optional version to refresh import status indicators. */
  importStatusVersion?: number;
}

/** Display label and description for a Pinkka stack item. */
export function PinkkaStackItem({
  stack,
  preferredLang,
  importStatusVersion,
}: PinkkaStackItemProps) {
  const label = getLocalizedText(stack.name, preferredLang);
  const description = getLocalizedText(stack.description, preferredLang);
  const [isImported, setIsImported] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void isPinkkaStackImported(stack.id).then((imported) => {
      if (!isMounted) return;
      setIsImported(imported);
    });
    return () => {
      isMounted = false;
    };
  }, [stack.id, importStatusVersion]);
  return (
    <div className="flex items-start gap-2">
      <span
        className={
          isImported
            ? "mt-1.5 h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.7)]"
            : "mt-1.5 h-2 w-2 rounded-full bg-transparent"
        }
        aria-hidden="true"
      />
      <div>
        <MiddleEllipsisText
          className="font-medium"
          text={label || `Stack ${stack.id}`}
        />
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}
