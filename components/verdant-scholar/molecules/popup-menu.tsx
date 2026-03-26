"use client";

/** Verdant Scholar popup menus provide editorial, keyboard-friendly selection lists and quick actions. */
import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronUp } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VerdantScholarButton } from "@/components/verdant-scholar/atoms/button";
import { cn } from "@/lib/utils";

/**
 * Item metadata rendered inside a Verdant Scholar popup menu.
 * @property description Optional supporting line shown below the main label.
 * @property disabled Whether the item is unavailable.
 * @property id Stable item identifier used for selection.
 * @property label Primary text shown for the item.
 * @property leading Optional content shown before the text block.
 * @property trailing Optional content shown after the text block.
 */
export interface VerdantScholarPopupMenuItem {
  description?: string;
  disabled?: boolean;
  id: string;
  label: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}

/**
 * Props for Verdant Scholar popup menus.
 * @property align Dropdown alignment relative to the trigger.
 * @property className Optional wrapper classes for the trigger.
 * @property contentClassName Optional classes for the popup surface.
 * @property items Menu items rendered in order.
 * @property label Trigger label.
 * @property onSelect Called when the user selects an item.
 * @property selectedItemId Optional selected item id for visual highlighting.
 * @property side Dropdown side relative to the trigger.
 * @property triggerAriaLabel Accessible label for the trigger.
 */
export interface VerdantScholarPopupMenuProps {
  align?: "center" | "end" | "start";
  className?: string;
  contentClassName?: string;
  items: VerdantScholarPopupMenuItem[];
  label: string;
  onSelect?: (item: VerdantScholarPopupMenuItem) => void;
  selectedItemId?: string;
  side?: "bottom" | "left" | "right" | "top";
  triggerAriaLabel?: string;
}

/** Verdant Scholar-styled popup menu with clear selected state and keyboard navigation. */
export function VerdantScholarPopupMenu({
  align = "center",
  className,
  contentClassName,
  items,
  label,
  onSelect,
  selectedItemId,
  side = "top",
  triggerAriaLabel,
}: VerdantScholarPopupMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !selectedItemId) return;

    const frameId = window.requestAnimationFrame(() => {
      const selectedItem = document.querySelector<HTMLElement>(
        `[data-vs-popup-selected="true"]`,
      );
      selectedItem?.scrollIntoView({ block: "center" });
      selectedItem?.focus();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isOpen, selectedItemId]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <VerdantScholarButton
          aria-label={triggerAriaLabel ?? label}
          className={cn(
            "h-10 rounded-[var(--vs-radius-md)] bg-[var(--vs-color-surface-container-highest)] px-3 text-[var(--vs-color-on-surface)] hover:bg-[var(--vs-color-surface-container)]",
            className,
          )}
          size="sm"
          variant="secondary"
        >
          <span className="text-xs font-semibold">{label}</span>
          <ChevronUp
            className={cn(
              "size-4 transition-transform duration-200",
              isOpen ? "rotate-180" : "",
            )}
          />
        </VerdantScholarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn(
          "w-[min(24rem,calc(100vw-2rem))] p-2 rounded-lg",
          "border-[color:rgba(67,73,57,0.2)] bg-[color:rgba(252,249,248,0.98)]",
          "shadow-[0_18px_48px_rgba(28,27,27,0.16)] backdrop-blur-sm",
          contentClassName,
        )}
        side={side}
      >
        <div className="max-h-[min(28rem,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto pr-1">
          {items.map((item) => {
            const isSelected = item.id === selectedItemId;

            return (
              <DropdownMenuItem
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                  "mb-1 flex items-start gap-3 rounded-sm px-3 py-2 text-[var(--vs-color-on-surface)] last:mb-0",
                )}
                data-vs-popup-selected={isSelected ? "true" : "false"}
                disabled={item.disabled}
                key={item.id}
                onSelect={() => {
                  if (item.disabled) return;
                  onSelect?.(item);
                  setIsOpen(false);
                }}
              >
                {item.leading ? (
                  <span className="pt-0.5 text-[var(--vs-color-on-surface-variant)]">
                    {item.leading}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {item.label}
                  </span>
                  {item.description ? (
                    <span
                      className={cn(
                        "block truncate text-xs",
                        isSelected
                          ? "text-[var(--vs-color-on-secondary-container)]/80"
                          : "text-[var(--vs-color-on-surface-variant)]",
                      )}
                    >
                      {item.description}
                    </span>
                  ) : null}
                </span>
                {item.trailing ? (
                  <span className="pt-0.5 text-[var(--vs-color-on-surface-variant)]">
                    {item.trailing}
                  </span>
                ) : isSelected ? (
                  <Check className="mt-0.5 size-4 text-[var(--vs-color-primary)]" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
