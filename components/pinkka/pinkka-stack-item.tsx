"use client";

import { useEffect, useState } from "react";
import { MiddleEllipsisText } from "@/components/middle-ellipsis-text";
import { isPinkkaStackImported } from "@/lib/firebase/firestore-helpers";
import { getLocalizedText, type PinkkaSubStack } from "@/lib/pinkka/pinkka-api";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";

/** Props for rendering a Pinkka stack row. */
export interface PinkkaStackItemProps {
  /** Pinkka stack payload to display. */
  stack: PinkkaSubStack;
  /** Optional selected parent group id. */
  groupId?: number | null;
  /** Preferred language for localized fields. */
  preferredLang: PinkkaLanguage;
  /** Optional version to refresh import status indicators. */
  importStatusVersion?: number;
}

/** Display label and description for a Pinkka stack item. */
export function PinkkaStackItem({
  stack,
  groupId,
  preferredLang,
  importStatusVersion,
}: PinkkaStackItemProps) {
  const label = getLocalizedText(stack.name, preferredLang);
  const description = getLocalizedText(stack.description, preferredLang);
  const [isImported, setIsImported] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void isPinkkaStackImported(stack.id, {
      groupId: groupId ?? stack.pinkka?.id,
    }).then((imported) => {
      if (!isMounted) return;
      setIsImported(imported);
    });
    return () => {
      isMounted = false;
    };
  }, [groupId, importStatusVersion, stack.id, stack.pinkka?.id]);

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
          text={label || `Stack ${stack.id}`}
        />
      </div>
    </div>
  );
}
