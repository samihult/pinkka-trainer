/** Verdant Scholar top navigation matches the floating editorial header from the Stitch layouts. */
import { CircleUserRound } from "lucide-react";

import { cn } from "@/lib/utils";

import { VerdantScholarIconButton } from "../atoms/icon-button";
import { VerdantScholarInput } from "../atoms/input";

/** Navigation item metadata for the Verdant Scholar top navigation. */
export interface VerdantScholarNavigationItem {
  href?: string;
  label: string;
}

/**
 * Props for the Verdant Scholar top navigation.
 * @property activeLabel Label that should render in the active state.
 * @property brand Primary brand label.
 * @property className Optional wrapper classes.
 * @property items Navigation items rendered in order.
 * @property searchPlaceholder Optional search placeholder.
 */
export interface VerdantScholarTopNavigationProps {
  activeLabel?: string;
  brand: string;
  className?: string;
  items: VerdantScholarNavigationItem[];
  searchPlaceholder?: string;
}

/** Floating editorial navigation bar with optional inline search. */
export function VerdantScholarTopNavigation({
  activeLabel,
  brand,
  className,
  items,
  searchPlaceholder,
}: VerdantScholarTopNavigationProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 bg-[color:rgba(252,249,248,0.72)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[var(--vs-layout-max-width)] items-center justify-between gap-6 px-6 py-4 lg:px-8">
        <div className="min-w-0 flex-1">
          <p className="text-xl text-[var(--vs-color-primary)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
            {brand}
          </p>
        </div>
        <nav className="hidden items-center gap-8 md:flex">
          {items.map((item) => {
            const isActive = activeLabel === item.label;

            return (
              <a
                key={item.label}
                className={cn(
                  "text-[length:var(--vs-font-label-md)] [font-family:var(--vs-font-label-family)] font-semibold transition-all duration-200",
                  isActive
                    ? "border-b-2 border-[var(--vs-color-primary)] pb-1 text-[var(--vs-color-primary)]"
                    : "pb-1 text-[color:rgba(28,27,27,0.62)] hover:text-[var(--vs-color-primary)]",
                )}
                href={item.href ?? "#"}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          {searchPlaceholder ? (
            <div className="hidden w-full max-w-xs lg:block">
              <VerdantScholarInput
                aria-label={searchPlaceholder}
                className="h-10 bg-[color:rgba(229,226,225,0.58)] text-sm shadow-none"
                placeholder={searchPlaceholder}
              />
            </div>
          ) : null}
          <VerdantScholarIconButton aria-label="Profile" size="sm">
            <CircleUserRound className="size-4" />
          </VerdantScholarIconButton>
        </div>
      </div>
    </header>
  );
}
