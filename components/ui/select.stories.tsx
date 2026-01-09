import type { Meta, StoryObj } from "@storybook/react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
};

export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select defaultValue="ferns">
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select a category" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Groups</SelectLabel>
          <SelectItem value="ferns">Ferns</SelectItem>
          <SelectItem value="mosses">Mosses</SelectItem>
          <SelectItem value="lichen">Lichens</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Favorites</SelectLabel>
          <SelectItem value="conifers">Conifers</SelectItem>
          <SelectItem value="shrubs">Shrubs</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};
