import { cn } from "@/lib/utils";

/** Props for rendering a keyboard hint sequence. */
export interface KeyboardHintProps {
  /** Ordered key labels shown as styled keycaps. */
  keys: string[];
  /** Optional wrapper class name. */
  className?: string;
}

/** Render one or more keyboard keycaps with consistent styling. */
export function KeyboardHint({ keys, className }: KeyboardHintProps) {
  return (
    <span className={cn("flex items-center gap-1", className)}>
      {keys.map((key, index) => (
        <kbd
          key={`${key}-${index}`}
          className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] text-muted-foreground"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
