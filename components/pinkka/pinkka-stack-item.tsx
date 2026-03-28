"use client";

/** Pinkka explorer row for a stack with an import-status indicator from context. */

import { MiddleEllipsisText } from "@/components/middle-ellipsis-text";
import { usePinkkaImportStatusContext } from "@/components/pinkka/pinkka-import-status-context";
import { getLocalizedText, type PinkkaSubStack } from "@/lib/pinkka/pinkka-api";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";

const DEFAULT_STATUS = {
  isImported: false,
  isIncomplete: false,
} as const;

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
  const { selectedGroupId, stackImportStatusesByGroup } =
    usePinkkaImportStatusContext();
  const status =
    typeof selectedGroupId === "number"
      ? (stackImportStatusesByGroup[selectedGroupId]?.[stack.id] ??
        DEFAULT_STATUS)
      : DEFAULT_STATUS;
  const label = getLocalizedText(stack.name, preferredLang);

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
          text={label || `Stack ${stack.id}`}
        />
      </div>
    </div>
  );
}
