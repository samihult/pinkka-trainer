/** Verdant Scholar progress bars provide quiet session and mastery feedback. */
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * Props for Verdant Scholar progress bars.
 * @property className Optional wrapper classes.
 * @property tone Fill color treatment.
 * @property value Percentage value from 0 to 100.
 */
export interface VerdantScholarProgressBarProps {
  className?: string;
  tone?: "primary" | "secondary";
  value: number;
}

const toneClasses: Record<
  NonNullable<VerdantScholarProgressBarProps["tone"]>,
  string
> = {
  primary: "bg-[var(--vs-color-primary)]",
  secondary: "bg-[var(--vs-color-secondary-container)]",
};

/** Quiet horizontal progress indicator with tonal track styling. */
export function VerdantScholarProgressBar({
  className,
  tone = "primary",
  value,
}: VerdantScholarProgressBarProps) {
  return (
    <Progress
      aria-label={`${Math.max(0, Math.min(100, value))}%`}
      className={cn(
        "h-1.5 rounded-[var(--vs-radius-pill)] bg-[color:rgba(194,201,180,0.28)] [&_[data-slot=progress-indicator]]:rounded-[inherit]",
        toneClasses[tone],
        className,
      )}
      value={Math.max(0, Math.min(100, value))}
    />
  );
}
