"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

/** Shadcn-compatible wrapper around Radix collapsible primitives. */
const Collapsible = CollapsiblePrimitive.Root;

/** Trigger used to toggle collapsible content sections. */
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

/** Content wrapper for collapsible sections. */
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
