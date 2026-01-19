import type { QuizAnswerMode, QuizMode, QuizPreferences } from "../types";

/** Default quiz preferences applied when user settings are missing. */
export const DEFAULT_QUIZ_PREFERENCES: QuizPreferences = {
  questionCount: 10,
  mode: "multiple-choice",
  answerMode: "either",
};

const quizModes: QuizMode[] = ["multiple-choice", "write-name"];
const answerModes: QuizAnswerMode[] = ["scientific", "vernacular", "either"];

/**
 * Normalize quiz preferences, filling missing fields with defaults and
 * validating enum values.
 */
export function normalizeQuizPreferences(
  input?: Partial<QuizPreferences> | null,
  defaults: QuizPreferences = DEFAULT_QUIZ_PREFERENCES,
): QuizPreferences {
  const normalizedQuestionCount =
    typeof input?.questionCount === "number" &&
    Number.isFinite(input?.questionCount)
      ? Math.max(2, Math.floor(input.questionCount))
      : defaults.questionCount;

  const normalizedMode = quizModes.includes(input?.mode as QuizMode)
    ? (input?.mode as QuizMode)
    : defaults.mode;

  const normalizedAnswerMode = answerModes.includes(
    input?.answerMode as QuizAnswerMode,
  )
    ? (input?.answerMode as QuizAnswerMode)
    : defaults.answerMode;

  return {
    questionCount: normalizedQuestionCount,
    mode: normalizedMode,
    answerMode: normalizedAnswerMode,
  };
}
