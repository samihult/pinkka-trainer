import type { Meta, StoryObj } from "@storybook/react";

import { verdantScholarTokens } from "./tokens";
import { VerdantScholarTheme } from "./verdant-scholar-theme";

const meta: Meta = {
  title: "Verdant Scholar/Tokens",
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj;

export const Reference: Story = {
  render: () => (
    <VerdantScholarTheme className="min-h-screen" padding="comfortable">
      <div className="mx-auto w-full max-w-[var(--vs-layout-max-width)] space-y-10">
        <section className="space-y-4">
          <p className="text-[length:var(--vs-font-label-sm)] font-bold uppercase tracking-[0.24em] text-[var(--vs-color-primary)]">
            Verdant Scholar
          </p>
          <h1 className="text-[length:var(--vs-font-display-md)] leading-none text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-extrabold tracking-tight">
            Stitch-derived tokens reference
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-[var(--vs-color-on-surface-variant)]">
            The palette, layering model, type scale, and gradients are copied
            from the attached Stitch export and scoped for Storybook-only
            review.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-[length:var(--vs-font-headline-md)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
            Colors
          </h2>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            {Object.entries(verdantScholarTokens.colors).map(
              ([name, value]) => (
                <div
                  key={name}
                  className="rounded-[var(--vs-radius-md)] bg-[var(--vs-color-surface-container-low)] p-4"
                >
                  <div
                    className="h-20 rounded-[var(--vs-radius-sm)]"
                    style={{ backgroundColor: value }}
                  />
                  <p className="mt-4 text-sm font-semibold text-[var(--vs-color-on-surface)]">
                    {name}
                  </p>
                  <p className="text-sm text-[var(--vs-color-on-surface-variant)]">
                    {value}
                  </p>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-[var(--vs-radius-md)] bg-[var(--vs-color-surface-container-low)] p-6">
            <h2 className="text-[length:var(--vs-font-headline-sm)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
              Typography
            </h2>
            <div className="mt-5 space-y-4">
              <p className="text-[length:var(--vs-font-display-lg)] leading-none text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-extrabold">
                Aa
              </p>
              <p className="text-sm text-[var(--vs-color-on-surface-variant)]">
                Display: {verdantScholarTokens.typography.displayLg}
              </p>
              <p className="text-[length:var(--vs-font-headline-md)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold">
                Section Headline
              </p>
            </div>
          </article>
          <article className="rounded-[var(--vs-radius-md)] bg-[var(--vs-color-surface-container-low)] p-6">
            <h2 className="text-[length:var(--vs-font-headline-sm)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
              Radii
            </h2>
            <div className="mt-5 flex items-end gap-4">
              {Object.entries(verdantScholarTokens.radii).map(
                ([name, value]) => (
                  <div key={name} className="text-center">
                    <div
                      className="size-20 bg-[var(--vs-color-secondary-container)]"
                      style={{ borderRadius: value }}
                    />
                    <p className="mt-3 text-sm font-medium text-[var(--vs-color-on-surface)]">
                      {name}
                    </p>
                  </div>
                ),
              )}
            </div>
          </article>
          <article className="rounded-[var(--vs-radius-md)] bg-[var(--vs-color-surface-container-low)] p-6">
            <h2 className="text-[length:var(--vs-font-headline-sm)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
              Gradients & Elevation
            </h2>
            <div className="mt-5 space-y-4">
              <div
                className="rounded-[var(--vs-radius-sm)] p-5 text-white"
                style={{
                  backgroundImage: verdantScholarTokens.gradients.primary,
                }}
              >
                Primary gradient
              </div>
              <div
                className="rounded-[var(--vs-radius-sm)] bg-white p-5"
                style={{ boxShadow: verdantScholarTokens.shadows.floating }}
              >
                Floating shadow
              </div>
            </div>
          </article>
        </section>
      </div>
    </VerdantScholarTheme>
  ),
};
