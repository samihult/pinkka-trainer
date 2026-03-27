/** Verdant Scholar filter groups model the quiet taxonomy controls from the explore screen. */
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { VerdantScholarChoiceChip } from "../atoms/choice-chip";
import { VerdantScholarText } from "../atoms/text";

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
 * @property onItemSelect Optional callback used when the filter group should be interactive.
 * @property title Group title.
 * @property variant Visual grouping style.
 */
export interface VerdantScholarFilterGroupProps {
  className?: string;
  items: VerdantScholarFilterItem[];
  onItemSelect?: (item: VerdantScholarFilterItem) => void;
  title: string;
  variant: "checkboxes" | "chips" | "counts";
}

/** Taxonomy filter group with checkbox, chip, or status-count treatments. */
export function VerdantScholarFilterGroup({
  className,
  items,
  onItemSelect,
  title,
  variant,
}: VerdantScholarFilterGroupProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <VerdantScholarText asChild tone="muted" variant="eyebrow">
        <h3>{title}</h3>
      </VerdantScholarText>
      {variant === "checkboxes" ? (
        <div className="space-y-2">
          {items.map((item) =>
            onItemSelect ? (
              <Button
                aria-pressed={item.selected}
                className="h-auto w-full justify-start gap-3 bg-transparent px-0 py-0 text-left text-sm font-normal shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:shadow-[var(--vs-shadow-focus)]"
                key={item.label}
                onClick={() => onItemSelect(item)}
                size="sm"
                type="button"
                variant="ghost"
              >
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
              </Button>
            ) : (
              <div className="flex items-center gap-3 text-sm" key={item.label}>
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
            ),
          )}
        </div>
      ) : null}
      {variant === "chips" ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) =>
            onItemSelect ? (
              <VerdantScholarChoiceChip
                key={item.label}
                onClick={() => onItemSelect(item)}
                selected={item.selected}
              >
                {item.label}
              </VerdantScholarChoiceChip>
            ) : (
              <VerdantScholarChoiceChip
                key={item.label}
                selected={item.selected}
              >
                {item.label}
              </VerdantScholarChoiceChip>
            ),
          )}
        </div>
      ) : null}
      {variant === "counts" ? (
        <div className="space-y-3">
          {items.map((item) =>
            onItemSelect ? (
              <Button
                aria-pressed={item.selected}
                key={item.label}
                className="h-auto w-full justify-between gap-4 bg-transparent px-0 py-0 text-left text-sm font-normal shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:shadow-[var(--vs-shadow-focus)]"
                onClick={() => onItemSelect(item)}
                size="sm"
                type="button"
                variant="ghost"
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
              </Button>
            ) : (
              <div
                className="flex items-center justify-between gap-4 text-sm"
                key={item.label}
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
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}
