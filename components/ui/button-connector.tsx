import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonConnectorProps {
  className?: string;
  primary?: boolean;
}

function ButtonConnector({ className, primary = false }: ButtonConnectorProps) {
  return (
    <div
      className={cn(
        "h-[2px] w-2",
        primary ? "bg-primary" : "bg-secondary",
        className,
      )}
    ></div>
  );
}

export { ButtonConnector, ButtonConnectorProps };
