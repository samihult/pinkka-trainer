import type {
  LegacyTestAnswerMode,
  TestAnswerNameMode,
  TestAnswerScope,
  TestMode,
  TestPreferences,
} from "../types";

type TestPreferencesInput = Partial<TestPreferences> & {
  /** @deprecated Legacy accepted-answer mode from older preference records. */
  answerMode?: LegacyTestAnswerMode;
};

/** Default test preferences applied when user settings are missing. */
export const DEFAULT_TEST_PREFERENCES: TestPreferences = {
  questionCount: 10,
  mode: "multiple-choice",
  answerScope: "species",
  answerNameMode: "either",
};

const testModes: TestMode[] = ["multiple-choice", "write-name"];
const answerScopes: TestAnswerScope[] = ["species", "genus", "family"];
const answerNameModes: TestAnswerNameMode[] = [
  "scientific",
  "vernacular",
  "either",
];

export const questionCountOptions = [10, 25, 50, 0];

/**
 * Normalize test preferences, filling missing fields with defaults and
 * validating enum values.
 */
export function normalizeTestPreferences(
  input?: TestPreferencesInput | null,
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

  const requestedAnswerScope = input?.answerScope;
  const normalizedAnswerScope =
    requestedAnswerScope && answerScopes.includes(requestedAnswerScope)
      ? requestedAnswerScope
      : defaults.answerScope;

  const requestedAnswerNameMode = input?.answerNameMode;
  const normalizedAnswerNameMode =
    requestedAnswerNameMode && answerNameModes.includes(requestedAnswerNameMode)
      ? requestedAnswerNameMode
      : input?.answerMode && answerNameModes.includes(input.answerMode)
        ? input.answerMode
        : defaults.answerNameMode;

  return {
    questionCount: normalizedQuestionCount,
    mode: normalizedMode,
    answerScope: normalizedAnswerScope,
    answerNameMode: normalizedAnswerNameMode,
  };
}
