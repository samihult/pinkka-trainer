import type {
  LegacyTestAnswerMode,
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
};

const testModes: TestMode[] = ["multiple-choice", "write-name"];
const answerScopes: TestAnswerScope[] = ["species", "genus", "family"];
const legacyAnswerModeToScope: Record<LegacyTestAnswerMode, TestAnswerScope> = {
  scientific: "species",
  vernacular: "species",
  either: "species",
};

function mapLegacyAnswerModeToScope(
  mode: LegacyTestAnswerMode,
): TestAnswerScope {
  return legacyAnswerModeToScope[mode];
}

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
      : input?.answerMode
        ? mapLegacyAnswerModeToScope(input.answerMode)
        : defaults.answerScope;

  return {
    questionCount: normalizedQuestionCount,
    mode: normalizedMode,
    answerScope: normalizedAnswerScope,
  };
}
