import { describe, expect, it } from 'vitest';
import {
  countMatches,
  evaluateDraw,
  generateRandomNumbers,
  generateWeightedNumbers,
  monthlyPoolMinor,
  runDraw,
  scoreFrequency,
  tierForMatches,
  tierPools,
  type DrawOutcome,
  type Entry,
  type PoolSettings,
  type Tier,
} from './draw';

const SETTINGS: PoolSettings = { prizePoolPercent: 50, tier5Percent: 40, tier4Percent: 35, tier3Percent: 25 };
const DRAWN = [1, 2, 3, 4, 5];
const entry = (userId: string, scores: number[]): Entry => ({ userId, scores });
const tierOf = (o: DrawOutcome, t: Tier) => o.tiers.find((x) => x.tier === t)!;

/** Small deterministic RNG (mulberry32) so tests never flake. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('number generation', () => {
  it('random: 5 distinct sorted numbers in 1-45', () => {
    for (let seed = 0; seed < 200; seed++) {
      const nums = generateRandomNumbers(seeded(seed));
      expect(nums).toHaveLength(5);
      expect(new Set(nums).size).toBe(5);
      expect(nums.every((n) => n >= 1 && n <= 45)).toBe(true);
      expect(nums).toEqual([...nums].sort((a, b) => a - b));
    }
  });

  it('weighted: still valid with no entries', () => {
    const nums = generateWeightedNumbers([], seeded(1));
    expect(new Set(nums).size).toBe(5);
    expect(nums.every((n) => n >= 1 && n <= 45)).toBe(true);
  });

  it('weighted: favours frequent scores', () => {
    const entries = Array.from({ length: 1000 }, (_, i) => entry(`u${i}`, [1, 2, 3, 4, 5]));
    let hits = 0;
    for (let seed = 0; seed < 200; seed++) {
      if (JSON.stringify(generateWeightedNumbers(entries, seeded(seed))) === JSON.stringify(DRAWN)) hits++;
    }
    expect(hits).toBeGreaterThan(150);
  });

  it('frequency counts each user once per number', () => {
    const freq = scoreFrequency([entry('a', [7, 7, 7, 8, 9]), entry('b', [7, 1, 2, 3, 4])]);
    expect(freq.get(7)).toBe(2);
    expect(freq.get(8)).toBe(1);
  });
});

describe('matching', () => {
  it('counts distinct matches', () => {
    expect(countMatches(DRAWN, [1, 2, 3, 4, 5])).toBe(5);
    expect(countMatches(DRAWN, [5, 4, 3, 2, 1])).toBe(5);
    expect(countMatches(DRAWN, [1, 1, 2, 9, 9])).toBe(2);
    expect(countMatches(DRAWN, [10, 11, 12, 13, 14])).toBe(0);
  });

  it('maps matches to tiers', () => {
    expect(tierForMatches(5)).toBe(5);
    expect(tierForMatches(4)).toBe(4);
    expect(tierForMatches(3)).toBe(3);
    expect(tierForMatches(2)).toBeNull();
    expect(tierForMatches(0)).toBeNull();
  });
});

describe('pool maths', () => {
  it('pool is a percent of summed monthly fees, rounded down', () => {
    expect(monthlyPoolMinor([49900, 49900, 41583], 50)).toBe(70691);
    expect(monthlyPoolMinor([], 50)).toBe(0);
  });

  it('splits tiers 40/35/25', () => {
    expect(tierPools(100000, SETTINGS)).toEqual({ tier5: 40000, tier4: 35000, tier3: 25000 });
  });

  it('adds carry-in to the 5-match tier only', () => {
    expect(tierPools(100000, SETTINGS, 5000)).toEqual({ tier5: 45000, tier4: 35000, tier3: 25000 });
  });

  it('rounds each tier down', () => {
    expect(tierPools(10001, SETTINGS)).toEqual({ tier5: 4000, tier4: 3500, tier3: 2500 });
  });

  it('rejects tier percents that do not add to 100', () => {
    expect(() => tierPools(1000, { ...SETTINGS, tier5Percent: 50 })).toThrow();
  });
});

describe('evaluateDraw', () => {
  it('assigns each tier and splits equally', () => {
    const entries = [
      entry('A', [1, 2, 3, 4, 5]),
      entry('B', [1, 2, 3, 4, 40]),
      entry('C', [1, 2, 3, 40, 41]),
      entry('D', [1, 2, 3, 10, 11]),
      entry('E', [10, 11, 12, 13, 14]),
    ];
    const o = evaluateDraw(DRAWN, entries, tierPools(100000, SETTINGS));
    expect(tierOf(o, 5).winnerIds).toEqual(['A']);
    expect(tierOf(o, 5).prizeEachMinor).toBe(40000);
    expect(tierOf(o, 4).winnerIds).toEqual(['B']);
    expect(tierOf(o, 4).prizeEachMinor).toBe(35000);
    expect(tierOf(o, 3).winnerIds).toEqual(['C', 'D']);
    expect(tierOf(o, 3).prizeEachMinor).toBe(12500);
    expect(tierOf(o, 3).leftoverMinor).toBe(0);
    expect(o.jackpotRolloverMinor).toBe(0);
    expect(o.entries.find((r) => r.userId === 'E')!.matchCount).toBe(0);
  });

  it('rolls the jackpot (with carry-in) when nobody matches 5', () => {
    const pools = tierPools(100000, SETTINGS, 5000);
    const o = evaluateDraw(DRAWN, [entry('B', [1, 2, 3, 4, 40]), entry('C', [1, 2, 3, 40, 41])], pools);
    expect(tierOf(o, 5).winnerIds).toEqual([]);
    expect(o.jackpotRolloverMinor).toBe(45000);
    expect(tierOf(o, 4).prizeEachMinor).toBe(35000);
    expect(tierOf(o, 3).prizeEachMinor).toBe(25000);
  });

  it('does not roll over unclaimed 4 and 3 tiers', () => {
    const pools = tierPools(100000, SETTINGS, 5000);
    const o = evaluateDraw(DRAWN, [entry('C', [1, 2, 3, 40, 41])], pools);
    expect(tierOf(o, 4).winnerIds).toEqual([]);
    expect(tierOf(o, 4).leftoverMinor).toBe(35000);
    expect(o.jackpotRolloverMinor).toBe(45000);
  });

  it('keeps the rounding remainder with the platform', () => {
    const o = evaluateDraw(
      DRAWN,
      [entry('a', [1, 2, 3, 40, 41]), entry('b', [1, 2, 3, 40, 41]), entry('c', [1, 2, 3, 40, 41])],
      { tier5: 0, tier4: 0, tier3: 10000 },
    );
    expect(tierOf(o, 3).prizeEachMinor).toBe(3333);
    expect(tierOf(o, 3).paidOutMinor).toBe(9999);
    expect(tierOf(o, 3).leftoverMinor).toBe(1);
  });

  it('splits the jackpot between several 5-match winners', () => {
    const o = evaluateDraw(DRAWN, [entry('a', [1, 2, 3, 4, 5]), entry('b', [5, 4, 3, 2, 1])], {
      tier5: 40001,
      tier4: 0,
      tier3: 0,
    });
    expect(tierOf(o, 5).prizeEachMinor).toBe(20000);
    expect(tierOf(o, 5).leftoverMinor).toBe(1);
    expect(o.jackpotRolloverMinor).toBe(0);
  });
});

describe('runDraw', () => {
  const base = {
    mode: 'random' as const,
    entries: [entry('u1', [1, 2, 3, 4, 5]), entry('u2', [1, 2, 3, 40, 41])],
    monthlyEquivalentsMinor: [49900, 49900, 49900],
    settings: SETTINGS,
    jackpotCarryInMinor: 0,
  };

  it('uses supplied numbers and computes pools and winners', () => {
    const r = runDraw({ ...base, drawnNumbers: DRAWN });
    expect(r.drawnNumbers).toEqual(DRAWN);
    expect(r.activeSubscriberCount).toBe(3);
    expect(r.poolTotalMinor).toBe(74850);
    expect(r.pools).toEqual({ tier5: 29940, tier4: 26197, tier3: 18712 });
    expect(tierOf(r.outcome, 5).winnerIds).toEqual(['u1']);
    expect(tierOf(r.outcome, 5).prizeEachMinor).toBe(29940);
    expect(tierOf(r.outcome, 3).winnerIds).toEqual(['u2']);
    expect(tierOf(r.outcome, 4).leftoverMinor).toBe(26197);
    expect(r.outcome.jackpotRolloverMinor).toBe(0);
  });

  it('is deterministic for the same rng seed', () => {
    expect(runDraw({ ...base, rng: seeded(7) })).toEqual(runDraw({ ...base, rng: seeded(7) }));
  });

  it('simulation and publish agree when numbers are reused', () => {
    const sim = runDraw({ ...base, mode: 'algorithmic', rng: seeded(3) });
    const pub = runDraw({ ...base, mode: 'algorithmic', drawnNumbers: sim.drawnNumbers });
    expect(pub).toEqual(sim);
  });

  it('rejects invalid drawn numbers', () => {
    expect(() => runDraw({ ...base, drawnNumbers: [1, 1, 2, 3, 4] })).toThrow();
    expect(() => runDraw({ ...base, drawnNumbers: [1, 2, 3, 4] })).toThrow();
    expect(() => runDraw({ ...base, drawnNumbers: [1, 2, 3, 4, 46] })).toThrow();
    expect(() => runDraw({ ...base, drawnNumbers: [0, 1, 2, 3, 4] })).toThrow();
  });
});