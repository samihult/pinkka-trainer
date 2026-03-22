/** Mock home-page card stats keep favorite and mastery indicators stable until real data is designed. */
const MOCK_MASTERY_SEQUENCE = [84, 42, 91, 15, 56, 68, 37, 73] as const;
const MOCK_FAVORITE_SEQUENCE = [true, false, true, false, true, false] as const;

/**
 * Stable mock presentation state for a home page group card.
 * @property initialFavorite Initial favorite toggle state for the card.
 * @property masteryPercent Mock mastery percentage shown in the card footer.
 */
export interface MockHomeGroupStats {
  initialFavorite: boolean;
  masteryPercent: number;
}

/** Return repeatable mock presentation data for a group card by its display order. */
export function getMockHomeGroupStats(index: number): MockHomeGroupStats {
  return {
    initialFavorite:
      MOCK_FAVORITE_SEQUENCE[index % MOCK_FAVORITE_SEQUENCE.length],
    masteryPercent: MOCK_MASTERY_SEQUENCE[index % MOCK_MASTERY_SEQUENCE.length],
  };
}
