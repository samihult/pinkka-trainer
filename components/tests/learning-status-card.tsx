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
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base font-semibold">
            Likelihood to remember after a week{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({label})
            </span>
          </CardTitle>
          <span className="text-sm font-semibold">{combinedPercent}%</span>
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={combinedPercent} className="h-2" />
      </CardContent>
    </Card>
  );
}
