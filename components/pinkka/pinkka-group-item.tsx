"use client";

/** Pinkka explorer row for a group with an import-status indicator from context. */

import { MiddleEllipsisText } from "@/components/middle-ellipsis-text";
import { usePinkkaImportStatusContext } from "@/components/pinkka/pinkka-import-status-context";
import { getLocalizedText, type PinkkaGroup } from "@/lib/pinkka/pinkka-api";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";

const DEFAULT_STATUS = {
  isImported: false,
  isIncomplete: false,
} as const;

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
  const { groupImportStatuses } = usePinkkaImportStatusContext();
  const status = groupImportStatuses[group.id] ?? DEFAULT_STATUS;
  const label = getLocalizedText(group.name, preferredLang);

  return (
    <div className="flex items-center gap-2">
      <span
        className={
          status.isIncomplete
            ? "shrink-0 h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.7)]"
            : status.isImported
              ? "shrink-0 h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.7)]"
              : "shrink-0 h-2 w-2 rounded-full bg-transparent"
        }
        aria-hidden="true"
      />
      <MiddleEllipsisText
        className="font-medium"
        text={label || `Group ${group.id}`}
      />
    </div>
  );
}
