import type { QuizAnswerMode, QuizMode, QuizPreferences } from "../types";

/** Default quiz preferences applied when user settings are missing. */
export const DEFAULT_QUIZ_PREFERENCES: QuizPreferences = {
  questionCount: 10,
  mode: "multiple-choice",
  answerMode: "either",
};

const quizModes: QuizMode[] = ["multiple-choice", "write-name"];
const answerModes: QuizAnswerMode[] = ["scientific", "vernacular", "either"];

export const questionCountOptions = [10, 25, 50, 0];

/**
 * Normalize quiz preferences, filling missing fields with defaults and
 * validating enum values.
 */
export function normalizeQuizPreferences(
  input?: Partial<QuizPreferences> | null,
  defaults: QuizPreferences = DEFAULT_QUIZ_PREFERENCES,
): QuizPreferences {
  const requestedQuestionCount = input?.questionCount;
  const normalizedQuestionCount =
    typeof requestedQuestionCount === "number" &&
    questionCountOptions.includes(requestedQuestionCount)
      ? requestedQuestionCount
      : defaults.questionCount;

  const requestedMode = input?.mode;
  const normalizedMode =
    requestedMode && quizModes.includes(requestedMode)
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
