/** Verdant Scholar atmospheric background container atom for animated habitat gradients. */
import * as React from "react";

import { cn } from "@/lib/utils";

const ATMOSPHERE_DRIFT_KEYFRAMES = `
  @keyframes verdant-scholar-drift {
    0% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(10%, 5%) scale(1.1); }
    100% { transform: translate(0, 0) scale(1); }
  }
`;

const driftStyle: React.CSSProperties = {
  animation: "verdant-scholar-drift 20s ease-in-out infinite",
};

const driftSlowStyle: React.CSSProperties = {
  animation: "verdant-scholar-drift 35s ease-in-out infinite",
};

const driftReverseStyle: React.CSSProperties = {
  animation: "verdant-scholar-drift 25s ease-in-out infinite reverse",
};

/** Supported animated atmosphere variants from the Stitch atmospheric backgrounds. */
export type VerdantScholarAtmosphereVariant =
  | "subarctic-dawn"
  | "deep-forest-canopy"
  | "misty-marshland";

/**
 * Props for Verdant Scholar atmospheric containers.
 * @property children Optional foreground content layered above the animated atmosphere.
 * @property className Optional container classes for framing (rounding, size, positioning).
 * @property contentClassName Optional classes for the foreground content wrapper.
 * @property variant Atmosphere variant to render.
 */
export interface VerdantScholarAtmosphereContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  contentClassName?: string;
  variant: VerdantScholarAtmosphereVariant;
}

function renderAtmosphereLayers(variant: VerdantScholarAtmosphereVariant) {
  if (variant === "subarctic-dawn") {
    return (
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[#e0f2fe]" />
        <div
          className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-[#fce7f3] opacity-60 blur-[100px]"
          style={driftStyle}
        />
        <div className="absolute right-10 bottom-10 h-60 w-60 animate-pulse rounded-full bg-white opacity-80 blur-[80px]" />
        <div className="absolute inset-0 backdrop-blur-2xl" />
      </div>
    );
  }

  if (variant === "deep-forest-canopy") {
    return (
      <div className="absolute inset-0">
        <div
          className="absolute -top-[10%] -left-[10%] h-[70%] w-[60%] rounded-full bg-[#3f6a00] opacity-40 blur-[120px]"
          style={driftStyle}
        />
        <div
          className="absolute -right-[10%] -bottom-[20%] h-[80%] w-[70%] rounded-full bg-[#2a2827] opacity-50 blur-[120px]"
          style={driftSlowStyle}
        />
        <div className="absolute top-[20%] right-[10%] h-[50%] w-[50%] animate-pulse rounded-full bg-[#8cc24d] opacity-30 blur-[120px]" />
        <div className="absolute inset-0 opacity-60 backdrop-blur-3xl" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[#f0eded]" />
      <div
        className="absolute -bottom-20 -left-20 h-80 w-full rounded-full bg-[#496640] opacity-30 blur-[110px]"
        style={driftReverseStyle}
      />
      <div className="absolute top-10 right-10 h-60 w-60 animate-pulse rounded-full bg-[#d8c860] opacity-15 blur-[120px]" />
      <div className="absolute inset-0 backdrop-blur-3xl" />
    </div>
  );
}

/** Container that renders one of the Verdant Scholar animated atmospheric backgrounds. */
export function VerdantScholarAtmosphereContainer({
  children,
  className,
  contentClassName,
  variant,
  ...props
}: VerdantScholarAtmosphereContainerProps) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden",
        variant === "deep-forest-canopy" ? "bg-[#f6f3f2]" : "",
        className,
      )}
      {...props}
    >
      <style>{ATMOSPHERE_DRIFT_KEYFRAMES}</style>
      {renderAtmosphereLayers(variant)}
      {children ? (
        <div className={cn("relative z-10 h-full w-full", contentClassName)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
