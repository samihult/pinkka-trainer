"use client";

import { useEffect, useState } from "react";
import { MiddleEllipsisText } from "@/components/middle-ellipsis-text";
import {
  getPinkkaGroupImportStatus,
  type PinkkaImportStatus,
} from "@/lib/firebase/firestore-helpers";
import { getLocalizedText, type PinkkaGroup } from "@/lib/pinkka/pinkka-api";
import type { PinkkaLanguage } from "@/components/pinkka/pinkka-types";

/** Props for rendering a Pinkka group row. */
export interface PinkkaGroupItemProps {
  /** Pinkka group payload to display. */
  group: PinkkaGroup;
  /** Preferred language for localized fields. */
  preferredLang: PinkkaLanguage;
  /** Optional version to refresh import status indicators. */
  importStatusVersion?: number;
}

/** Display label for a Pinkka group item. */
export function PinkkaGroupItem({
  group,
  preferredLang,
  importStatusVersion,
}: PinkkaGroupItemProps) {
  const label = getLocalizedText(group.name, preferredLang);
  const [status, setStatus] = useState<PinkkaImportStatus>({
    isImported: false,
    isIncomplete: false,
  });

  useEffect(() => {
    let isMounted = true;
    void getPinkkaGroupImportStatus(group.id).then((nextStatus) => {
      if (!isMounted) return;
      setStatus(nextStatus);
    });
    return () => {
      isMounted = false;
    };
  }, [group.id, importStatusVersion]);

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
