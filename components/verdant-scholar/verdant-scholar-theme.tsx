/** Scoped Verdant Scholar theme wrapper with isolated tokens and typography. */
import type { CSSProperties, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

import { verdantScholarThemeVariables } from "./tokens";

/** Supported outer spacing presets for Verdant Scholar previews and embeds. */
export type VerdantScholarThemePadding = "none" | "compact" | "comfortable";

/**
 * Props for the scoped Verdant Scholar theme wrapper.
 * @property children Nested content rendered with Verdant Scholar tokens.
 * @property className Optional wrapper classes.
 * @property padding Internal wrapper spacing preset.
 */
export interface VerdantScholarThemeProps extends PropsWithChildren {
  className?: string;
  padding?: VerdantScholarThemePadding;
}

const paddingClassNames: Record<VerdantScholarThemePadding, string> = {
  none: "p-0",
  compact: "p-4 sm:p-6",
  comfortable: "p-6 sm:p-8 lg:p-10 xl:p-12",
};

const verdantScholarStyles = verdantScholarThemeVariables as CSSProperties;
const verdantScholarGoogleFontImport = `
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@700;800&display=swap");
`;

/** Enables Verdant Scholar tokens without changing the production app theme. */
export function VerdantScholarTheme({
  children,
  className,
  padding = "comfortable",
}: VerdantScholarThemeProps) {
  return (
    <>
      <style>{verdantScholarGoogleFontImport}</style>
      <section
        data-verdant-scholar
        style={verdantScholarStyles}
        className={cn(
          "min-h-full rounded-[var(--vs-radius-xl)] bg-[var(--vs-color-background)] text-[var(--vs-color-on-background)] [font-family:var(--vs-font-body-family)] antialiased",
          paddingClassNames[padding],
          className,
        )}
      >
        {children}
      </section>
    </>
  );
}
