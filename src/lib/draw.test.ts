import { describe, it, expect } from "vitest";
import { drawNumbers, runDraw, PoolSettings, DrawEntry, SubscriberFee } from "./draw";

describe("drawNumbers", () => {
  it("draws 5 distinct numbers between 1 and 45 in random mode", () => {
    const numbers = drawNumbers("random", []);
    expect(numbers).toHaveLength(5);
    const set = new Set(numbers);
    expect(set.size).toBe(5);
    for (const n of numbers) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(45);
    }
  });

  it("draws 5 distinct numbers in algorithmic mode", () => {
    const entries: DrawEntry[] = [
      { userId: "u1", scores: [10, 20, 30, 40, 45] },
      { userId: "u2", scores: [10, 15, 25, 30, 42] },
    ];
    const numbers = drawNumbers("algorithmic", entries);
    expect(numbers).toHaveLength(5);
    const set = new Set(numbers);
    expect(set.size).toBe(5);
  });
});

describe("runDraw", () => {
  const defaultSettings: PoolSettings = {
    prize_pool_percent: 50,
    tier5_percent: 40,
    tier4_percent: 35,
    tier3_percent: 25,
  };

  it("computes pool, matches, tier splits, and jackpot rollover with fixed numbers", () => {
    const subscribers: SubscriberFee[] = [
      { userId: "u1", monthlyEquivalentMinor: 49900 },
      { userId: "u2", monthlyEquivalentMinor: 49900 },
    ];

    // Total pool = floor(49900 * 0.5) * 2 = 24950 * 2 = 49900
    // Tier 5 (40%) = floor(49900 * 0.4) = 19960
    // Tier 4 (35%) = floor(49900 * 0.35) = 17465
    // Tier 3 (25%) = floor(49900 * 0.25) = 12475

    const fixedNumbers = [5, 12, 23, 34, 45];
    const entries: DrawEntry[] = [
      { userId: "u1", scores: [5, 12, 23, 34, 45] }, // 5 matches -> Tier 5 winner
      { userId: "u2", scores: [5, 12, 23, 34, 1] },  // 4 matches -> Tier 4 winner
    ];

    const result = runDraw({
      mode: "random",
      subscribers,
      entries,
      settings: defaultSettings,
      jackpotCarryInMinor: 5000,
      fixedNumbers,
    });

    expect(result.poolTotalMinor).toBe(49900);
    // Tier 5 pool with carry in: 19960 + 5000 = 24960
    expect(result.tier5PoolMinor).toBe(24960);
    expect(result.tier4PoolMinor).toBe(17465);
    expect(result.tier3PoolMinor).toBe(12475);

    // Winners
    expect(result.winners).toHaveLength(2);
    const wTier5 = result.winners.find((w) => w.tier === 5);
    const wTier4 = result.winners.find((w) => w.tier === 4);

    expect(wTier5?.userId).toBe("u1");
    expect(wTier5?.prizeMinor).toBe(24960);

    expect(wTier4?.userId).toBe("u2");
    expect(wTier4?.prizeMinor).toBe(17465);

    // Since tier 5 had a winner, jackpot rollover should be 0
    expect(result.jackpotRolloverMinor).toBe(0);
  });

  it("rolls over entire tier 5 pool when there is no 5-match winner", () => {
    const subscribers: SubscriberFee[] = [
      { userId: "u1", monthlyEquivalentMinor: 10000 },
    ];
    // Pool = 5000
    // Tier 5 (40%) = 2000
    const entries: DrawEntry[] = [
      { userId: "u1", scores: [1, 2, 3, 4, 6] },
    ];
    const fixedNumbers = [10, 20, 30, 40, 45]; // 0 matches

    const result = runDraw({
      mode: "random",
      subscribers,
      entries,
      settings: defaultSettings,
      fixedNumbers,
    });

    expect(result.winners).toHaveLength(0);
    expect(result.tier5PoolMinor).toBe(2000);
    expect(result.jackpotRolloverMinor).toBe(2000);
  });
});
