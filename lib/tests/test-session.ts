/** Pure helpers for weighted test selection and delayed retry queueing. */

/** Minimum weight kept for very familiar species so they still occasionally appear. */
const MIN_SELECTION_WEIGHT = 0.15;

/** Extra bias applied to species without any familiarity data. */
const NEW_SPECIES_WEIGHT = 1.25;

/**
 * Returns a weighted-random selection score for a familiarity value.
 * Lower familiarity means a higher chance of being selected.
 */
export function getQuestionSelectionWeight(
  familiarityScore: number | null,
): number {
  if (familiarityScore === null) {
    return NEW_SPECIES_WEIGHT;
  }

  return Math.max(MIN_SELECTION_WEIGHT, 1.15 - familiarityScore);
}

/**
 * Selects items without replacement using familiarity-weighted randomness.
 * Less-learned or unseen items are favored over highly familiar ones.
 */
export function selectItemsForTest<T extends { id: string }>(
  items: T[],
  count: number,
  familiarityById: Map<string, number | null>,
  random: () => number = Math.random,
): T[] {
  const total = Math.min(count, items.length);
  if (total <= 0) {
    return [];
  }

  const pool = [...items];
  const selected: T[] = [];

  while (selected.length < total && pool.length > 0) {
    const weights = pool.map((item) =>
      getQuestionSelectionWeight(familiarityById.get(item.id) ?? null),
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    if (totalWeight <= 0) {
      selected.push(...pool.splice(0, total - selected.length));
      break;
    }

    let cursor = random() * totalWeight;
    let selectedIndex = weights.length - 1;

    for (let index = 0; index < weights.length; index += 1) {
      cursor -= weights[index];
      if (cursor <= 0) {
        selectedIndex = index;
        break;
      }
    }

    selected.push(pool.splice(selectedIndex, 1)[0]);
  }

  return selected;
}

/**
 * Calculates where a missed question should be reinserted so it does not
 * immediately repeat when there are later questions available.
 */
export function getDelayedRetryInsertIndex(
  currentIndex: number,
  queueLength: number,
  minimumGap = 1,
): number {
  return Math.min(queueLength, currentIndex + minimumGap + 1);
}
