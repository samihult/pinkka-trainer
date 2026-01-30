import type { Preview } from "@storybook/nextjs-vite";
import { initialize, mswDecorator } from "msw-storybook-addon";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";
import "../app/globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

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
          className={`${geist.variable} ${geistMono.variable} min-h-screen bg-background text-foreground font-sans antialiased`}
        >
          <Story />
          <Toaster />
        </div>
      </AuthProvider>
    ),
  ],
};

export default preview;
