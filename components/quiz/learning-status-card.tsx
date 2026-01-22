"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

/** Props for the LearningStatusCard component. */
export interface LearningStatusCardProps {
  /** Verbal label for the combined learning status. */
  label: string;
  /** Combined retention score in the 0-1 range. */
  combinedScore: number;
  /** Horizon in days used for the retention estimate. */
  horizonDays: number;
  /** Accuracy retention score in the 0-1 range. */
  accuracyScore: number | null;
  /** Speed retention score in the 0-1 range. */
  speedScore: number | null;
}

/** Renders a learning status summary for the current species. */
export function LearningStatusCard({
  label,
  combinedScore,
  horizonDays,
  accuracyScore,
  speedScore,
}: LearningStatusCardProps) {
  const combinedPercent = Math.round(combinedScore * 100);
  const accuracyPercent =
    accuracyScore === null ? null : Math.round(accuracyScore * 100);
  const speedPercent =
    speedScore === null ? null : Math.round(speedScore * 100);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Learning status</CardTitle>
        <p className="text-sm text-muted-foreground">
          Estimated retention for the next {horizonDays} days.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold">{label}</span>
          <span className="text-sm text-muted-foreground">
            {combinedPercent}% retained
          </span>
        </div>
        <Progress value={combinedPercent} className="h-2" />
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <div>
            Accuracy:{" "}
            {accuracyPercent === null
              ? "Not started"
              : `${accuracyPercent}%`}
          </div>
          <div>
            Speed:{" "}
            {speedPercent === null ? "Not started" : `${speedPercent}%`}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
