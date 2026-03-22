/** Storybook stories for the Verdant Scholar answer-option molecule. */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { VerdantScholarAnswerOption } from "./answer-option";
import { withVerdantScholarTheme } from "../storybook-utils";

function InteractiveAssessmentDemo() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const correctKey = "C";
  const options = [
    { label: "Melastomataceae", optionKey: "A" },
    { label: "Asteraceae", optionKey: "B" },
    { label: "Ericaceae", optionKey: "C" },
    { label: "Rubiaceae", optionKey: "D" },
  ];

  return (
    <div className="max-w-3xl space-y-3">
      {options.map((option) => {
        const isSelected = selectedKey === option.optionKey;
        const isCorrect = option.optionKey === correctKey;
        const state =
          selectedKey === null
            ? "default"
            : isCorrect
              ? "correct"
              : isSelected
                ? "incorrect"
                : "default";

        return (
          <VerdantScholarAnswerOption
            key={option.optionKey}
            label={option.label}
            onSelect={() => setSelectedKey(option.optionKey)}
            optionKey={option.optionKey}
            state={state}
            suffix={
              isCorrect && selectedKey !== null ? "Correct Specimen" : undefined
            }
          />
        );
      })}
    </div>
  );
}

const meta = {
  title: "Verdant Scholar/Molecules/Answer Option",
  component: VerdantScholarAnswerOption,
  decorators: [withVerdantScholarTheme],
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    label: "Melastomataceae",
    optionKey: "A",
    state: "default",
  },
} satisfies Meta<typeof VerdantScholarAnswerOption>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Correct: Story = {
  args: {
    label: "Ericaceae",
    optionKey: "C",
    state: "correct",
    suffix: "Correct Specimen",
  },
};

export const Incorrect: Story = {
  args: {
    state: "incorrect",
  },
};

export const InteractiveAssessment: Story = {
  render: () => <InteractiveAssessmentDemo />,
};
