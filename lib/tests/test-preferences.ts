import type { TestAnswerMode, TestMode, TestPreferences } from "../types";

/** Default test preferences applied when user settings are missing. */
export const DEFAULT_TEST_PREFERENCES: TestPreferences = {
  questionCount: 10,
  mode: "multiple-choice",
  answerMode: "either",
};

const testModes: TestMode[] = ["multiple-choice", "write-name"];
const answerModes: TestAnswerMode[] = ["scientific", "vernacular", "either"];

export const questionCountOptions = [10, 25, 50, 0];

/**
 * Normalize test preferences, filling missing fields with defaults and
 * validating enum values.
 */
export function normalizeTestPreferences(
  input?: Partial<TestPreferences> | null,
  defaults: TestPreferences = DEFAULT_TEST_PREFERENCES,
): TestPreferences {
  const requestedQuestionCount = input?.questionCount;
  const normalizedQuestionCount =
    typeof requestedQuestionCount === "number" &&
    questionCountOptions.includes(requestedQuestionCount)
      ? requestedQuestionCount
      : defaults.questionCount;

  const requestedMode = input?.mode;
  const normalizedMode =
    requestedMode && testModes.includes(requestedMode)
      ? requestedMode
      : defaults.mode;

  const requestedAnswerMode = input?.answerMode;
  const normalizedAnswerMode =
    requestedAnswerMode && answerModes.includes(requestedAnswerMode)
      ? requestedAnswerMode
      : defaults.answerMode;

  return {
    questionCount: normalizedQuestionCount,
    mode: normalizedMode,
    answerMode: normalizedAnswerMode,
  };
}
