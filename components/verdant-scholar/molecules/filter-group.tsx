/** Verdant Scholar filter groups model the quiet taxonomy controls from the explore screen. */
import { cn } from "@/lib/utils";

/**
 * Item metadata for Verdant Scholar filter groups.
 * @property count Optional count shown on the right.
 * @property label Filter label.
 * @property selected Whether the item is selected or active.
 * @property swatchClass Optional dot swatch class for status legends.
 */
export interface VerdantScholarFilterItem {
  count?: number;
  label: string;
  selected?: boolean;
  swatchClass?: string;
}

/**
 * Props for Verdant Scholar filter groups.
 * @property className Optional wrapper classes.
 * @property items Items rendered in order.
 * @property title Group title.
 * @property variant Visual grouping style.
 */
export interface VerdantScholarFilterGroupProps {
  className?: string;
  items: VerdantScholarFilterItem[];
  title: string;
  variant: "checkboxes" | "chips" | "counts";
}

/** Taxonomy filter group with checkbox, chip, or status-count treatments. */
export function VerdantScholarFilterGroup({
  className,
  items,
  title,
  variant,
}: VerdantScholarFilterGroupProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <h3 className="text-[length:var(--vs-font-label-sm)] [font-family:var(--vs-font-label-family)] font-semibold uppercase tracking-[0.22em] text-[var(--vs-color-on-surface-variant)]">
        {title}
      </h3>
      {variant === "checkboxes" ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-[var(--vs-radius-xs)] border border-[color:rgba(194,201,180,0.4)] bg-[var(--vs-color-surface-container-lowest)]",
                  item.selected
                    ? "border-[var(--vs-color-primary)] bg-[var(--vs-color-primary)]"
                    : "",
                )}
              >
                {item.selected ? (
                  <span className="size-1.5 rounded-full bg-white" />
                ) : null}
              </span>
              <span className="text-[var(--vs-color-on-surface)]">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {variant === "chips" ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <div
              key={item.label}
              className={cn(
                "rounded-[var(--vs-radius-xs)] px-3 py-1.5 text-[length:var(--vs-font-label-md)] [font-family:var(--vs-font-label-family)] font-semibold",
                item.selected
                  ? "bg-[var(--vs-color-secondary-container)] text-[var(--vs-color-on-secondary-container)]"
                  : "bg-[var(--vs-color-surface-container)] text-[var(--vs-color-on-surface)]",
              )}
            >
              {item.label}
            </div>
          ))}
        </div>
      ) : null}
      {variant === "counts" ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <span className="flex items-center gap-2 text-[var(--vs-color-on-surface)]">
                {item.swatchClass ? (
                  <span
                    className={cn("size-2 rounded-full", item.swatchClass)}
                  />
                ) : null}
                {item.label}
              </span>
              <span className="text-[length:var(--vs-font-label-md)] [font-family:var(--vs-font-label-family)] text-[var(--vs-color-on-surface-variant)]">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
