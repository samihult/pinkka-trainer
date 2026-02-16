/*
  Fuzzy test scoring for TypeScript
   - Returns score in [0, 1]
   - Handles multiple correct answers (takes the best score)
   - Unicode aware normalization (NFKC + optional diacritics removal)
   - Robust for 1–2 words: compares both original token order and sorted token order
*/

export type ScoreOptions = {
  /** Remove diacritics (é -> e). Good for user input flexibility. */
  stripDiacritics?: boolean; // default true
  /** Treat hyphen/underscore as space, and collapse whitespace. */
  normalizeSeparators?: boolean; // default true
};

const DEFAULTS: Required<ScoreOptions> = {
  stripDiacritics: true,
  normalizeSeparators: true,
};

function normalizeText(input: string, opts: Required<ScoreOptions>): string {
  let s = input.normalize("NFKC");

  // Lowercase in a locale-agnostic way; for most test uses this is fine.
  // If you need Turkish-specific behavior, pass locale explicitly and customize.
  s = s.toLowerCase();

  if (opts.normalizeSeparators) {
    // Replace common separators with spaces
    s = s.replace(/[_\-]+/g, " ");
  }

  // Remove punctuation-ish characters but keep letters/numbers/spaces.
  // Uses Unicode property escapes (requires modern JS/TS target).
  s = s.replace(/[^\p{L}\p{N}\s]/gu, " ");

  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();

  if (opts.stripDiacritics) {
    // Decompose and remove combining marks
    s = s.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
  }

  return s;
}

function tokenize(s: string): string[] {
  return s.split(" ").filter(Boolean);
}

function canonicalForms(s: string, opts: Required<ScoreOptions>): string[] {
  const norm = normalizeText(s, opts);
  if (!norm) return [""];

  const tokens = tokenize(norm);
  // Compare both token order and sorted tokens to be robust to "word order" swaps
  const inOrder = tokens.join(" ");
  const sorted = [...tokens].sort((a, b) => a.localeCompare(b)).join(" ");

  // De-duplicate in case it's identical
  return inOrder === sorted ? [inOrder] : [inOrder, sorted];
}

/**
 * Damerau–Levenshtein distance (optimal string alignment variant).
 * Good for typos including adjacent transpositions.
 */
function damerauLevenshtein(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;

  // dp[i][j] = distance between a[0..i) and b[0..j)
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );

  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= m; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;

      let best = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost, // substitution
      );

      // adjacent transposition
      if (
        i > 1 &&
        j > 1 &&
        a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
        a.charCodeAt(i - 2) === b.charCodeAt(j - 1)
      ) {
        best = Math.min(best, dp[i - 2][j - 2] + 1);
      }

      dp[i][j] = best;
    }
  }

  return dp[n][m];
}

function similarityFromDistance(a: string, b: string, dist: number): number {
  const denom = Math.max(a.length, b.length);
  if (denom === 0) return 1;
  // Clamp to [0,1]
  return Math.max(0, Math.min(1, 1 - dist / denom));
}

/**
 * Score a user answer against one expected answer, returning [0,1].
 * Uses multiple canonical forms to handle token order differences.
 */
export function scoreAgainstExpected(
  userAnswer: string,
  expectedAnswer: string,
  options: ScoreOptions = {},
): number {
  const opts = { ...DEFAULTS, ...options };
  const userForms = canonicalForms(userAnswer, opts);
  const expForms = canonicalForms(expectedAnswer, opts);

  let best = 0;

  for (const u of userForms) {
    for (const e of expForms) {
      const d = damerauLevenshtein(u, e);
      const s = similarityFromDistance(u, e, d);
      if (s > best) best = s;
      if (best === 1) return 1;
    }
  }

  return best;
}

/**
 * Score a user answer against multiple correct answers, returning [0,1].
 * Takes the maximum score across all expected answers.
 *
 * @example
 *   const score = scoreAnswer("São-Paulo", ["Sao Paulo", "São Paulo"]);
 *   console.log(score); // close to 1
 *   const accept = score >= 0.85;
 */
export function scoreAnswer(
  userAnswer: string,
  expectedAnswers: string[],
  options: ScoreOptions = {},
): number {
  let best = 0;
  for (const exp of expectedAnswers) {
    const s = scoreAgainstExpected(userAnswer, exp, options);
    if (s > best) best = s;
    if (best === 1) return 1;
  }
  return best;
}
