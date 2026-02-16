import type { Meta, StoryObj } from "@storybook/react";

import { KeyboardHint } from "./keyboard-hint";

const meta: Meta<typeof KeyboardHint> = {
  title: "UI/KeyboardHint",
  component: KeyboardHint,
};

export default meta;

type Story = StoryObj<typeof KeyboardHint>;

export const SingleKey: Story = {
  args: {
    keys: ["Space"],
  },
};

export const KeyCombo: Story = {
  args: {
    keys: ["⌘/Ctrl", "→"],
  },
};

export const NumberShortcut: Story = {
  args: {
    keys: ["2"],
  },
};
