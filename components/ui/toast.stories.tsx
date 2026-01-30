import type { Meta, StoryObj } from "@storybook/react";

import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";

const meta: Meta<typeof Toast> = {
  title: "UI/Toast",
  component: Toast,
};

export default meta;

type Story = StoryObj<typeof Toast>;

export const Default: Story = {
  render: () => (
    <ToastProvider>
      <Toast open>
        <div className="grid gap-1">
          <ToastTitle>Species saved</ToastTitle>
          <ToastDescription>
            Vulpes vulpes has been added to the stack.
          </ToastDescription>
        </div>
        <ToastAction altText="Undo changes">Undo</ToastAction>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
};
