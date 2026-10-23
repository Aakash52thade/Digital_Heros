/**
 * Draw engine. Pure functions only: no database, no network.
 * All money is an integer in minor units (paise).
 * Rules: SPEC.md A3-A7 and A17-A18.
 */

export const DRAW_SIZE = 5;
export const NUMBER_MIN = 1;
export const NUMBER_MAX = 45;

export type DrawMode = 'random' | 'algorithmic';
export type Tier = 5 | 4 | 3;
/** Returns a float in [0, 1). Injected so tests can be deterministic. */
export type Rng = () => number;

export interface Entry {
  userId: string;
  scores: number[]; // the user's current scores (eligible users have exactly 5)
}

export interface PoolSettings {
  prizePoolPercent: number;
  tier5Percent: number;
  tier4Percent: number;
  tier3Percent: number;
}

export interface TierPools {
  tier5: number;
  tier4: number;
  tier3: number;
}

export interface TierResult {
  tier: Tier;
  poolMinor: number;
  winnerIds: string[];
  prizeEachMinor: number;
  paidOutMinor: number;
  /** Not paid out: rounding remainder, or the whole pool when nobody won. */
  leftoverMinor: number;
}

export interface EntryResult {
  userId: string;
  scores: number[];
  matchCount: number;
}

export interface DrawOutcome {
  entries: EntryResult[];
  tiers: TierResult[]; // order: 5, 4, 3
  /** Only the 5-match jackpot rolls over (A6). Includes any carry-in. */
  jackpotRolloverMinor: number;
}

/** Default RNG backed by the platform's cryptographic generator. */
export const secureRng: Rng = () => {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
};

/** Pick `count` distinct numbers by weight, without replacement. Sorted ascending. */
function pickWeighted(weights: Map<number, number>, count: number, rng: Rng): number[] {
  const remaining = new Map(weights);
  const picked: number[] = [];
  for (let i = 0; i < count; i++) {
    let total = 0;
    for (const w of remaining.values()) total += w;
    let r = rng() * total;
    let chosen: number | undefined;
    for (const [n, w] of remaining) {
      r -= w;
      if (r < 0) {
        chosen = n;
        break;
      }
    }
    // Floating-point safety net: take the last remaining number.
    if (chosen === undefined) chosen = Array.from(remaining.keys()).pop() as number;
    picked.push(chosen);
    remaining.delete(chosen);
  }
  return picked.sort((a, b) => a - b);
}

/** A3, random mode: 5 distinct numbers from 1-45, uniform. */
export function generateRandomNumbers(rng: Rng = secureRng): number[] {
  const weights = new Map<number, number>();
  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) weights.set(n, 1);
  return pickWeighted(weights, DRAW_SIZE, rng);
}

/** How many users have each number among their scores (each user counts once per number). */
export function scoreFrequency(entries: Entry[]): Map<number, number> {
  const freq = new Map<number, number>();
  for (const e of entries) {
    for (const n of new Set(e.scores)) freq.set(n, (freq.get(n) ?? 0) + 1);
  }
  return freq;
}

/** A4, algorithmic mode: weight of n = (users holding n) + 1, so every number can be drawn. */
export function generateWeightedNumbers(entries: Entry[], rng: Rng = secureRng): number[] {
  const freq = scoreFrequency(entries);
  const weights = new Map<number, number>();
  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n++) weights.set(n, (freq.get(n) ?? 0) + 1);
  return pickWeighted(weights, DRAW_SIZE, rng);
}

export function generateNumbers(mode: DrawMode, entries: Entry[], rng: Rng = secureRng): number[] {
  return mode === 'algorithmic' ? generateWeightedNumbers(entries, rng) : generateRandomNumbers(rng);
}

/** Throws unless the numbers are 5 distinct integers from 1 to 45. */
export function validateDrawnNumbers(nums: number[]): void {
  const ok =
    nums.length === DRAW_SIZE &&
    new Set(nums).size === DRAW_SIZE &&
    nums.every((n) => Number.isInteger(n) && n >= NUMBER_MIN && n <= NUMBER_MAX);
  if (!ok) {
    throw new Error(`Drawn numbers must be ${DRAW_SIZE} distinct integers from ${NUMBER_MIN} to ${NUMBER_MAX}`);
  }
}

/** A3: how many drawn numbers appear in the user's scores (distinct values, each counted once). */
export function countMatches(drawn: number[], scores: number[]): number {
  const have = new Set(scores);
  let matches = 0;
  for (const n of new Set(drawn)) if (have.has(n)) matches++;
  return matches;
}

export function tierForMatches(matches: number): Tier | null {
  switch (matches) {
    case 5:
      return 5;
    case 4:
      return 4;
    case 3:
      return 3;
    default:
      return null;
  }
}

/** A2: pool = prizePoolPercent of the summed monthly-equivalent fees of ALL active subscribers. */
export function monthlyPoolMinor(monthlyEquivalentsMinor: number[], prizePoolPercent: number): number {
  const total = monthlyEquivalentsMinor.reduce((a, b) => a + b, 0);
  return Math.floor((total * prizePoolPercent) / 100);
}

/** A6: split the pool into tiers. The jackpot carry-in is added to the 5-match tier only. */
export function tierPools(poolTotalMinor: number, s: PoolSettings, jackpotCarryInMinor = 0): TierPools {
  if (s.tier5Percent + s.tier4Percent + s.tier3Percent !== 100) {
    throw new Error('Tier percentages must add up to 100');
  }
  return {
    tier5: Math.floor((poolTotalMinor * s.tier5Percent) / 100) + jackpotCarryInMinor,
    tier4: Math.floor((poolTotalMinor * s.tier4Percent) / 100),
    tier3: Math.floor((poolTotalMinor * s.tier3Percent) / 100),
  };
}

/**
 * A6: find winners per tier, split each tier equally (rounded down to the paisa),
 * and work out the jackpot rollover. Unclaimed 4/3 tiers do NOT roll over.
 */
export function evaluateDraw(drawn: number[], entries: Entry[], pools: TierPools): DrawOutcome {
  const results: EntryResult[] = entries.map((e) => ({
    userId: e.userId,
    scores: e.scores,
    matchCount: countMatches(drawn, e.scores),
  }));
  const poolByTier: Record<Tier, number> = { 5: pools.tier5, 4: pools.tier4, 3: pools.tier3 };

  const tiers: TierResult[] = ([5, 4, 3] as Tier[]).map((tier) => {
    const winnerIds = results.filter((r) => tierForMatches(r.matchCount) === tier).map((r) => r.userId);
    const poolMinor = poolByTier[tier];
    const prizeEachMinor = winnerIds.length > 0 ? Math.floor(poolMinor / winnerIds.length) : 0;
    const paidOutMinor = prizeEachMinor * winnerIds.length;
    return { tier, poolMinor, winnerIds, prizeEachMinor, paidOutMinor, leftoverMinor: poolMinor - paidOutMinor };
  });

  const jackpot = tiers[0];
  return {
    entries: results,
    tiers,
    jackpotRolloverMinor: jackpot.winnerIds.length === 0 ? jackpot.poolMinor : 0,
  };
}

export interface RunDrawInput {
  mode: DrawMode;
  /** Eligible users only (active subscription and exactly 5 scores, A5). */
  entries: Entry[];
  /** One monthly-equivalent fee per ACTIVE subscriber (A2). */
  monthlyEquivalentsMinor: number[];
  settings: PoolSettings;
  jackpotCarryInMinor: number;
  /** Reuse existing numbers (publish keeps the simulated numbers, A17). */
  drawnNumbers?: number[];
  rng?: Rng;
}

export interface RunDrawResult {
  drawnNumbers: number[];
  activeSubscriberCount: number;
  poolTotalMinor: number;
  pools: TierPools;
  jackpotCarryInMinor: number;
  outcome: DrawOutcome;
}

/** Simulation and publish both call this, so they can never disagree. */
export function runDraw(input: RunDrawInput): RunDrawResult {
  const drawnNumbers = input.drawnNumbers ?? generateNumbers(input.mode, input.entries, input.rng);
  validateDrawnNumbers(drawnNumbers);
  const poolTotalMinor = monthlyPoolMinor(input.monthlyEquivalentsMinor, input.settings.prizePoolPercent);
  const pools = tierPools(poolTotalMinor, input.settings, input.jackpotCarryInMinor);
  return {
    drawnNumbers: [...drawnNumbers].sort((a, b) => a - b),
    activeSubscriberCount: input.monthlyEquivalentsMinor.length,
    poolTotalMinor,
    pools,
    jackpotCarryInMinor: input.jackpotCarryInMinor,
    outcome: evaluateDraw(drawnNumbers, input.entries, pools),
  };
}