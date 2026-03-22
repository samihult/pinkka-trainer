/** Mock home-page card stats keep mastery indicators stable until real data is designed. */
const MOCK_MASTERY_SEQUENCE = [84, 42, 91, 15, 56, 68, 37, 73] as const;

/**
 * Stable mock presentation state for a home page group card.
 * @property masteryPercent Mock mastery percentage shown in the card footer.
 */
export interface MockHomeGroupStats {
  masteryPercent: number;
}

/** Return repeatable mock presentation data for a group card by its display order. */
export function getMockHomeGroupStats(index: number): MockHomeGroupStats {
  return {
    masteryPercent: MOCK_MASTERY_SEQUENCE[index % MOCK_MASTERY_SEQUENCE.length],
  };
}
