import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { SelectFromListDialog } from "@/components/select-from-list-dialog";
import type { SelectFromListOption } from "@/components/select-from-list-dialog";
import type { SelectFromListDialogProps } from "@/components/select-from-list-dialog";
import { Button } from "@/components/ui/button";

const sampleOptions: SelectFromListOption[] = [
  {
    id: "group-1",
    label: "Woodland Mammals",
    description: "12 stacks",
  },
  {
    id: "group-2",
    label: "Wetland Birds",
    description: "8 stacks",
  },
  {
    id: "group-3",
    label: "Forest Plants",
    description: "15 stacks",
  },
  {
    id: "group-4",
    label: "Insects of Finland",
    description: "22 stacks",
  },
];

type SelectFromListDialogStoryProps = Omit<
  SelectFromListDialogProps,
  "open" | "onOpenChange" | "onConfirm"
>;

function SelectFromListDialogStoryPreview(
  args: SelectFromListDialogStoryProps,
) {
  const [open, setOpen] = useState(false);
  const [lastSelection, setLastSelection] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen(true)}>Open selector</Button>
      {lastSelection ? (
        <p className="text-sm text-muted-foreground">
          Last selected option: {lastSelection}
        </p>
      ) : null}
      <SelectFromListDialog
        {...args}
        open={open}
        onOpenChange={setOpen}
        onConfirm={(selectedId) => {
          setLastSelection(selectedId);
          setOpen(false);
        }}
      />
    </div>
  );
}

const meta: Meta<typeof SelectFromListDialog> = {
  title: "Components/SelectFromListDialog",
  component: SelectFromListDialog,
  args: {
    title: "Create Group From Pinkka",
    description:
      "Select an imported group to create a new editable group with the same stacks.",
    options: sampleOptions,
    confirmLabel: "Create Group",
    emptyMessage:
      "No imported Pinkka groups found. Import groups first from the Pinkka tab.",
  },
  render: (args) => <SelectFromListDialogStoryPreview {...args} />,
};

export default meta;

type Story = StoryObj<typeof SelectFromListDialog>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    options: [],
  },
};
