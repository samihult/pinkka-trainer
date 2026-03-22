/** Shared Storybook helpers for Verdant Scholar component stories. */
import type { Decorator } from "@storybook/react";

import { VerdantScholarTheme } from "./verdant-scholar-theme";

/** Wraps component stories in the Verdant Scholar theme without affecting the live app. */
export const withVerdantScholarTheme: Decorator = (Story) => (
  <VerdantScholarTheme className="min-h-[22rem]">
    <Story />
  </VerdantScholarTheme>
);
