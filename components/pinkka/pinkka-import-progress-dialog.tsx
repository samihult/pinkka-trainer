"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { PinkkaImportProgress } from "@/lib/firebase/firestore-helpers";

/** Props for the Pinkka import progress dialog. */
export interface PinkkaImportProgressDialogProps {
  /** Whether the dialog is visible. */
  open: boolean;
  /** Current import progress. */
  progress: PinkkaImportProgress;
  /** Called when user requests interruption. */
  onInterrupt: () => void;
}

function toPercent(completed: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((completed / total) * 100);
}

/** Modal dialog that shows hierarchical Pinkka import progress. */
export function PinkkaImportProgressDialog({
  open,
  progress,
  onInterrupt,
}: PinkkaImportProgressDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-xl"
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Importing Pinkka Data</DialogTitle>
          <DialogDescription>
            Import progress is shown per group, stack, and species.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Groups</span>
              <span>
                {progress.groups.completed}/{progress.groups.total}
              </span>
            </div>
            <Progress
              value={toPercent(
                progress.groups.completed,
                progress.groups.total,
              )}
            />
            <p className="text-muted-foreground text-xs">
              {progress.groups.currentEntityName || "Waiting..."}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Stacks</span>
              <span>
                {progress.stacks.completed}/{progress.stacks.total}
              </span>
            </div>
            <Progress
              value={toPercent(
                progress.stacks.completed,
                progress.stacks.total,
              )}
            />
            <p className="text-muted-foreground text-xs">
              {progress.stacks.currentEntityName || "Waiting..."}
              {"  "}
              <span>
                {progress.stacks.imageDownloadsCompleted}/
                {progress.stacks.imageDownloadsTotal}
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Species</span>
              <span>
                {progress.species.completed}/{progress.species.total}
              </span>
            </div>
            <Progress
              value={toPercent(
                progress.species.completed,
                progress.species.total,
              )}
            />
            <p className="text-muted-foreground text-xs">
              {progress.species.currentEntityName || "Waiting..."}
              {"  "}
              <span>
                {progress.species.imageDownloadsCompleted}/
                {progress.species.imageDownloadsTotal}
              </span>
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="destructive" onClick={onInterrupt}>
            Interrupt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
