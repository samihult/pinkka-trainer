import type { Preview } from "@storybook/nextjs-vite";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";
import "../app/globals.css";

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
    (Story) => (
      <AuthProvider>
        <Story />
        <Toaster />
      </AuthProvider>
    ),
  ],
};

export default preview;
