/** Tests for weighted test-session helpers. */

import {
  getDelayedRetryInsertIndex,
  getQuestionSelectionWeight,
  selectItemsForTest,
} from "./test-session";

function createSeededRandom(seed: number) {
  let current = seed;

  return () => {
    current = (current * 1664525 + 1013904223) % 4294967296;
    return current / 4294967296;
  };
}

describe("test-session helpers", () => {
  it("assigns higher weights to new and less-learned species", () => {
    expect(getQuestionSelectionWeight(null)).toBeGreaterThan(
      getQuestionSelectionWeight(0.2),
    );
    expect(getQuestionSelectionWeight(0.2)).toBeGreaterThan(
      getQuestionSelectionWeight(0.85),
    );
  });

  it("prefers low-familiarity species across repeated weighted draws", () => {
    const items = [{ id: "new" }, { id: "learning" }, { id: "mastered" }];
    const familiarityById = new Map<string, number | null>([
      ["new", null],
      ["learning", 0.4],
      ["mastered", 0.95],
    ]);
    const counts = new Map<string, number>();
    const random = createSeededRandom(42);

    for (let index = 0; index < 1200; index += 1) {
      const [selected] = selectItemsForTest(items, 1, familiarityById, random);
      counts.set(selected.id, (counts.get(selected.id) ?? 0) + 1);
    }

    expect(counts.get("new") ?? 0).toBeGreaterThan(counts.get("learning") ?? 0);
    expect(counts.get("learning") ?? 0).toBeGreaterThan(
      counts.get("mastered") ?? 0,
    );
  });

  it("selects unique items without replacement", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const familiarityById = new Map<string, number | null>();
    const random = createSeededRandom(7);

    const selected = selectItemsForTest(items, 3, familiarityById, random);

    expect(selected).toHaveLength(3);
    expect(new Set(selected.map((item) => item.id)).size).toBe(3);
  });

  it("pushes failed questions behind at least one later question when possible", () => {
    expect(getDelayedRetryInsertIndex(1, 5)).toBe(3);
    expect(getDelayedRetryInsertIndex(3, 4)).toBe(4);
  });
});
