import path from "node:path";
import type { StorybookConfig } from "@storybook/nextjs-vite";

const __dirname = process.cwd();

const config: StorybookConfig = {
  stories: [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../components/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
  ],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
  async viteFinal(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": path.resolve(__dirname, "../"),
    };
    config.define = {
      ...(config.define ?? {}),
      "process.env.STORYBOOK": JSON.stringify("true"),
      "process.env.FIRESTORE_EMULATOR_HOST": JSON.stringify("127.0.0.1:8080"),
    };
    return config;
  },
};
export default config;
