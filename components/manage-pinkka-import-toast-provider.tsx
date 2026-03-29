/** Firestore-backed Pinkka import-job provider and cross-management progress toast. */
"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Progress } from "@/components/ui/progress";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import {
  requestPinkkaImportJobInterrupt,
  subscribePinkkaImportJobs,
  type PinkkaImportJob,
  type PinkkaImportJobAction,
  type PinkkaImportJobTarget,
} from "@/lib/firebase/firestore-helpers";
import { useI18n } from "@/lib/i18n";
import { logFirestoreError } from "@/lib/utils";

type ManagePinkkaImportToastContextValue = {
  jobs: PinkkaImportJob[];
  activeJobs: PinkkaImportJob[];
  activeJob: PinkkaImportJob | null;
  latestJob: PinkkaImportJob | null;
  requestInterrupt: (jobId: string) => Promise<void>;
};

const ManagePinkkaImportToastContext =
  createContext<ManagePinkkaImportToastContextValue | null>(null);

const TERMINAL_JOB_STATUSES = new Set<PinkkaImportJob["status"]>([
  "completed",
  "failed",
  "interrupted",
]);

function toPercent(completed: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((completed / total) * 100);
}

function isPinkkaJobActive(job: PinkkaImportJob): boolean {
  return job.status === "queued" || job.status === "running";
}

function isPinkkaJobTerminal(job: PinkkaImportJob): boolean {
  return TERMINAL_JOB_STATUSES.has(job.status);
}

function getPinkkaJobStatusOrder(job: PinkkaImportJob): number {
  if (isPinkkaJobActive(job)) {
    return 0;
  }
  if (job.status === "completed") {
    return 1;
  }
  if (job.status === "failed") {
    return 2;
  }
  return 3;
}

function getPinkkaJobHref(job: PinkkaImportJob): string | null {
  const primaryEntityId = job.entityIds[0];
  if (job.target === "group" && typeof primaryEntityId === "number") {
    return `/manage/pinkka?group=${primaryEntityId}`;
  }
  if (
    job.target === "stack" &&
    typeof job.groupId === "number" &&
    typeof primaryEntityId === "number"
  ) {
    return `/manage/pinkka?group=${job.groupId}&stack=${primaryEntityId}`;
  }
  if (
    job.target === "species" &&
    typeof job.groupId === "number" &&
    typeof job.stackId === "number" &&
    typeof primaryEntityId === "number"
  ) {
    return `/manage/pinkka?group=${job.groupId}&stack=${job.stackId}&species=${primaryEntityId}`;
  }
  return null;
}

function getPinkkaImportActionLabel(
  action: PinkkaImportJobAction,
  t: ReturnType<typeof useI18n>["t"],
): string {
  if (action === "reimport") {
    return t("manage.pinkkaImport.action.reimport");
  }
  if (action === "importmissing") {
    return t("manage.pinkkaImport.action.importmissing");
  }
  return t("manage.pinkkaImport.action.import");
}

function getPinkkaImportTargetLabel(
  target: PinkkaImportJobTarget,
  count: number,
  t: ReturnType<typeof useI18n>["t"],
): string {
  const plural = count !== 1;
  if (target === "species") {
    return plural
      ? t("manage.pinkkaImport.target.speciesPlural")
      : t("manage.pinkkaImport.target.speciesSingular");
  }
  if (target === "stack") {
    return plural
      ? t("manage.pinkkaImport.target.stackPlural")
      : t("manage.pinkkaImport.target.stackSingular");
  }
  return plural
    ? t("manage.pinkkaImport.target.groupPlural")
    : t("manage.pinkkaImport.target.groupSingular");
}

function PinkkaImportToastProgress({
  job,
  t,
}: {
  job: PinkkaImportJob;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const levels = [
    {
      key: "groups",
      label: t("manage.pinkkaImport.progress.groups"),
      value: job.progress.groups,
    },
    {
      key: "stacks",
      label: t("manage.pinkkaImport.progress.stacks"),
      value: job.progress.stacks,
    },
    {
      key: "species",
      label: t("manage.pinkkaImport.progress.species"),
      value: job.progress.species,
    },
  ] as const;

  return (
    <div className="mt-3 space-y-3">
      {levels.map((level) => (
        <div key={level.key} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs font-medium">
            <span>{level.label}</span>
            <span>
              {level.value.completed}/{level.value.total}
            </span>
          </div>
          <Progress
            value={toPercent(level.value.completed, level.value.total)}
            className="h-1.5"
          />
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="truncate">
              {level.value.currentEntityName ||
                t("manage.pinkkaImport.progress.waiting")}
            </span>
            {level.value.imageDownloadsTotal > 0 ? (
              <span className="shrink-0">
                {level.value.imageDownloadsCompleted}/
                {level.value.imageDownloadsTotal}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Provide global Pinkka import-job state for management pages. */
export function ManagePinkkaImportToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<PinkkaImportJob[]>([]);
  const [dismissedTerminalJobIds, setDismissedTerminalJobIds] = useState<
    string[]
  >([]);

  useEffect(() => {
    if (!user) {
      setJobs([]);
      setDismissedTerminalJobIds([]);
      return;
    }

    return subscribePinkkaImportJobs(user.uid, setJobs, (error) => {
      logFirestoreError("Failed to subscribe to Pinkka import jobs", error);
    });
  }, [user]);

  const activeJob = useMemo(
    () => jobs.find((job) => isPinkkaJobActive(job)) ?? null,
    [jobs],
  );
  const activeJobs = useMemo(
    () => jobs.filter((job) => isPinkkaJobActive(job)),
    [jobs],
  );
  const latestJob = jobs[0] ?? null;

  const visibleJobs = useMemo(() => {
    return jobs
      .filter(
        (job) =>
          isPinkkaJobActive(job) ||
          (isPinkkaJobTerminal(job) &&
            !dismissedTerminalJobIds.includes(job.id)),
      )
      .sort((left, right) => {
        const statusDifference =
          getPinkkaJobStatusOrder(left) - getPinkkaJobStatusOrder(right);
        if (statusDifference !== 0) {
          return statusDifference;
        }
        return right.updatedAt.getTime() - left.updatedAt.getTime();
      });
  }, [dismissedTerminalJobIds, jobs]);

  const requestInterrupt = async (jobId: string) => {
    await requestPinkkaImportJobInterrupt(jobId);
  };

  const contextValue = useMemo(
    () => ({
      jobs,
      activeJobs,
      activeJob,
      latestJob,
      requestInterrupt,
    }),
    [activeJob, activeJobs, jobs, latestJob],
  );

  return (
    <ManagePinkkaImportToastContext.Provider value={contextValue}>
      {children}
      <ManagePinkkaImportToaster
        jobs={visibleJobs}
        onDismissTerminalJob={(jobId) => {
          setDismissedTerminalJobIds((current) =>
            current.includes(jobId) ? current : [...current, jobId],
          );
        }}
        onRequestInterrupt={requestInterrupt}
      />
    </ManagePinkkaImportToastContext.Provider>
  );
}

function ManagePinkkaImportToaster({
  jobs,
  onDismissTerminalJob,
  onRequestInterrupt,
}: {
  jobs: PinkkaImportJob[];
  onDismissTerminalJob: (jobId: string) => void;
  onRequestInterrupt: (jobId: string) => Promise<void>;
}) {
  const { t } = useI18n();

  return (
    <ToastProvider>
      {jobs.map((job) => {
        const entityCount =
          job.summary?.completedEntityCount ?? job.entityIds.length;
        const actionLabel = getPinkkaImportActionLabel(job.action, t);
        const targetLabel = getPinkkaImportTargetLabel(
          job.target,
          entityCount,
          t,
        );
        const title =
          job.status === "queued"
            ? t("manage.pinkkaImport.toast.title.queued")
            : job.status === "running"
              ? t("manage.pinkkaImport.toast.title.running")
              : job.status === "completed"
                ? t("manage.pinkkaImport.toast.title.completed")
                : job.status === "interrupted"
                  ? t("manage.pinkkaImport.toast.title.interrupted")
                  : t("manage.pinkkaImport.toast.title.failed");
        const variant: "default" | "destructive" =
          job.status === "failed" ? "destructive" : "default";
        const href = getPinkkaJobHref(job);
        const action =
          isPinkkaJobActive(job) && !job.interruptRequestedAt ? (
            <ToastAction
              altText={t("manage.pinkkaImport.toast.interrupt")}
              onClick={() => {
                void onRequestInterrupt(job.id).catch((error) => {
                  logFirestoreError(
                    "Failed to request Pinkka import interruption",
                    error,
                  );
                });
              }}
            >
              {t("manage.pinkkaImport.toast.interrupt")}
            </ToastAction>
          ) : job.status === "completed" && href ? (
            <ToastAction
              asChild
              altText={t("manage.pinkkaImport.toast.openPinkka")}
            >
              <Link href={href}>
                {t("manage.pinkkaImport.toast.openPinkka")}
              </Link>
            </ToastAction>
          ) : undefined;

        return (
          <Toast
            key={job.id}
            open
            duration={Number.POSITIVE_INFINITY}
            variant={variant}
            onOpenChange={(open) => {
              if (open || !isPinkkaJobTerminal(job)) {
                return;
              }
              onDismissTerminalJob(job.id);
            }}
            className="border-emerald-900/10 bg-[color:var(--vs-color-surface-container-low)] shadow-[0_24px_60px_rgba(36,49,18,0.18)]"
          >
            <div className="grid w-full gap-1.5">
              <ToastTitle className="font-display text-sm text-[color:var(--vs-color-on-surface)]">
                {title}
              </ToastTitle>
              <ToastDescription asChild>
                <div className="text-sm text-[color:var(--vs-color-on-surface-variant)]">
                  {job.status === "completed" ? (
                    <p>
                      {t("manage.pinkkaImport.toast.description.completed", {
                        action: actionLabel,
                        count: entityCount,
                        target: targetLabel,
                      })}
                    </p>
                  ) : job.status === "failed" ? (
                    <div className="space-y-1">
                      <p>
                        {t("manage.pinkkaImport.toast.description.failed", {
                          action: actionLabel,
                          target: targetLabel,
                        })}
                      </p>
                      {job.errorMessage ? (
                        <p className="text-xs opacity-80">{job.errorMessage}</p>
                      ) : null}
                    </div>
                  ) : job.status === "interrupted" ? (
                    <p>
                      {t("manage.pinkkaImport.toast.description.interrupted", {
                        action: actionLabel,
                        target: targetLabel,
                      })}
                    </p>
                  ) : (
                    <div>
                      <p>
                        {t("manage.pinkkaImport.toast.description.active", {
                          action: actionLabel,
                          count: job.entityIds.length,
                          target: getPinkkaImportTargetLabel(
                            job.target,
                            job.entityIds.length,
                            t,
                          ),
                        })}
                      </p>
                      <PinkkaImportToastProgress job={job} t={t} />
                    </div>
                  )}
                </div>
              </ToastDescription>
            </div>
            {action}
            {isPinkkaJobTerminal(job) ? <ToastClose /> : null}
          </Toast>
        );
      })}
      <ToastViewport className="bottom-4 right-4 top-auto z-[120] flex-col p-4 sm:max-w-[420px]" />
    </ToastProvider>
  );
}

/** Read the active and most recent Pinkka import jobs inside management pages. */
export function useManagePinkkaImportToast() {
  const context = useContext(ManagePinkkaImportToastContext);
  if (!context) {
    throw new Error(
      "useManagePinkkaImportToast must be used within ManagePinkkaImportToastProvider.",
    );
  }
  return context;
}
