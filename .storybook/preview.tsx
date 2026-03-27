import type { Preview } from "@storybook/nextjs-vite";
import type { CSSProperties } from "react";
import { initialize, mswDecorator } from "msw-storybook-addon";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";
import { verdantScholarThemeVariables } from "@/components/verdant-scholar/tokens";
import "../app/globals.css";

const storybookFontVariables = {
  ...verdantScholarThemeVariables,
  "--font-inter": '"Inter", "Helvetica Neue", Arial, sans-serif',
  "--font-manrope": '"Manrope", "Arial Narrow", "Avenir Next", sans-serif',
  "--font-sans": '"Inter", "Helvetica Neue", Arial, sans-serif',
  "--font-mono": '"SFMono-Regular", "Menlo", "Monaco", monospace',
} as CSSProperties;

initialize({
  onUnhandledRequest: "bypass",
});

const preview: Preview = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/",
        push: async () => {},
        replace: async () => {},
        back: () => {},
        forward: () => {},
        prefetch: async () => {},
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    mswDecorator,
    (Story) => (
      <AuthProvider>
        <div
          className="min-h-screen bg-background text-foreground font-sans antialiased"
          style={storybookFontVariables}
        >
          <Story />
          <Toaster />
        </div>
      </AuthProvider>
    ),
  ],
};

export default preview;
