/**
 * Pure draw engine and pool math per SPEC A2-A6.
 * Zero database calls.
 */

export interface DrawEntry {
  userId: string;
  scores: number[]; // Exactly 5 scores (1-45)
}

export interface SubscriberFee {
  userId: string;
  monthlyEquivalentMinor: number;
}

export interface PoolSettings {
  prize_pool_percent: number; // e.g. 50
  tier5_percent: number;      // e.g. 40
  tier4_percent: number;      // e.g. 35
  tier3_percent: number;      // e.g. 25
}

export interface TierSummary {
  pool: number;
  winnersCount: number;
  prizeEach: number;
  leftover: number;
}

export interface CompactSimulation {
  numbers: number[];
  activeSubscriberCount: number;
  eligibleEntriesCount: number;
  poolTotalMinor: number;
  jackpotCarryInMinor: number;
  tier5: TierSummary;
  tier4: TierSummary;
  tier3: TierSummary;
  jackpotRolloverMinor: number;
}

export interface DrawResult {
  drawnNumbers: number[];
  activeSubscriberCount: number;
  poolTotalMinor: number;
  jackpotCarryInMinor: number;
  tier5PoolMinor: number;
  tier4PoolMinor: number;
  tier3PoolMinor: number;
  jackpotRolloverMinor: number;
  entries: Array<{
    userId: string;
    scoresSnapshot: number[];
    matchCount: number;
  }>;
  winners: Array<{
    userId: string;
    tier: 3 | 4 | 5;
    prizeMinor: number;
  }>;
  simulation: CompactSimulation;
}

/**
 * Draws 5 distinct numbers (1..45).
 * Random mode: uniform selection without replacement.
 * Algorithmic mode: weight of number n = count of eligible users who have n in their scores + 1.
 */
export function drawNumbers(
  mode: "random" | "algorithmic",
  entries: DrawEntry[],
  randomSource: () => number = Math.random
): number[] {
  const allNumbers = Array.from({ length: 45 }, (_, i) => i + 1);

  if (mode === "random") {
    const pool = [...allNumbers];
    const picked: number[] = [];
    for (let i = 0; i < 5; i++) {
      const idx = Math.floor(randomSource() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked.sort((a, b) => a - b);
  }

  // Algorithmic mode: weight = count(users who have n in scores) + 1
  const freqMap: Record<number, number> = {};
  for (const n of allNumbers) {
    freqMap[n] = 0;
  }
  for (const entry of entries) {
    const distinctScores = Array.from(new Set(entry.scores));
    for (const score of distinctScores) {
      if (freqMap[score] !== undefined) {
        freqMap[score] += 1;
      }
    }
  }

  const items = allNumbers.map((num) => ({
    num,
    weight: freqMap[num] + 1,
  }));

  const picked: number[] = [];
  for (let i = 0; i < 5; i++) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let rand = randomSource() * totalWeight;
    let selectedIndex = 0;
    for (let j = 0; j < items.length; j++) {
      rand -= items[j].weight;
      if (rand <= 0) {
        selectedIndex = j;
        break;
      }
    }
    picked.push(items.splice(selectedIndex, 1)[0].num);
  }

  return picked.sort((a, b) => a - b);
}

/**
 * Executes a draw calculation: pool distribution, entry matches, winner determination, and rollover.
 */
export function runDraw(params: {
  mode: "random" | "algorithmic";
  subscribers: SubscriberFee[];
  entries: DrawEntry[];
  settings: PoolSettings;
  jackpotCarryInMinor?: number;
  fixedNumbers?: number[];
  randomSource?: () => number;
}): DrawResult {
  const {
    mode,
    subscribers,
    entries,
    settings,
    jackpotCarryInMinor = 0,
    fixedNumbers,
    randomSource = Math.random,
  } = params;

  // 1. Drawn numbers
  const drawnNumbers =
    fixedNumbers && fixedNumbers.length === 5
      ? [...fixedNumbers].sort((a, b) => a - b)
      : drawNumbers(mode, entries, randomSource);

  const drawnSet = new Set(drawnNumbers);

  // 2. Prize pool calculation per A2: 50% (prize_pool_percent) of each active subscriber's monthly-equivalent fee
  let poolTotalMinor = 0;
  for (const sub of subscribers) {
    poolTotalMinor += Math.floor(
      (sub.monthlyEquivalentMinor * settings.prize_pool_percent) / 100
    );
  }

  // 3. Tier pools (integer paise)
  // Tier 5 pool gets carry-in jackpot added directly per A6 / A18
  const baseTier5Pool = Math.floor(
    (poolTotalMinor * settings.tier5_percent) / 100
  );
  const tier5PoolMinor = baseTier5Pool + Math.max(0, jackpotCarryInMinor);
  const tier4PoolMinor = Math.floor(
    (poolTotalMinor * settings.tier4_percent) / 100
  );
  const tier3PoolMinor = Math.floor(
    (poolTotalMinor * settings.tier3_percent) / 100
  );

  // 4. Calculate match counts per user
  const entryResults: DrawResult["entries"] = [];
  const tier5Winners: string[] = [];
  const tier4Winners: string[] = [];
  const tier3Winners: string[] = [];

  for (const entry of entries) {
    // Distinct values per A3
    const distinctScores = Array.from(new Set(entry.scores));
    let matchCount = 0;
    for (const score of distinctScores) {
      if (drawnSet.has(score)) {
        matchCount++;
      }
    }

    entryResults.push({
      userId: entry.userId,
      scoresSnapshot: [...entry.scores],
      matchCount,
    });

    if (matchCount === 5) {
      tier5Winners.push(entry.userId);
    } else if (matchCount === 4) {
      tier4Winners.push(entry.userId);
    } else if (matchCount === 3) {
      tier3Winners.push(entry.userId);
    }
  }

  // 5. Tier splits & winner generation
  const winners: DrawResult["winners"] = [];

  // Helper for tier distribution
  function calculateTier(pool: number, winnerIds: string[], tierNum: 3 | 4 | 5): TierSummary {
    if (winnerIds.length === 0) {
      return { pool, winnersCount: 0, prizeEach: 0, leftover: pool };
    }
    const prizeEach = Math.floor(pool / winnerIds.length);
    const leftover = pool - prizeEach * winnerIds.length;
    for (const uid of winnerIds) {
      winners.push({
        userId: uid,
        tier: tierNum,
        prizeMinor: prizeEach,
      });
    }
    return {
      pool,
      winnersCount: winnerIds.length,
      prizeEach,
      leftover,
    };
  }

  const tier5Summary = calculateTier(tier5PoolMinor, tier5Winners, 5);
  const tier4Summary = calculateTier(tier4PoolMinor, tier4Winners, 4);
  const tier3Summary = calculateTier(tier3PoolMinor, tier3Winners, 3);

  // 6. Rollover: if no 5-match winner, entire tier 5 pool rolls over. Otherwise 0 rollover.
  // Leftovers from tier 4 and 3 remain with platform.
  const jackpotRolloverMinor = tier5Winners.length === 0 ? tier5PoolMinor : 0;

  const simulation: CompactSimulation = {
    numbers: drawnNumbers,
    activeSubscriberCount: subscribers.length,
    eligibleEntriesCount: entries.length,
    poolTotalMinor,
    jackpotCarryInMinor,
    tier5: tier5Summary,
    tier4: tier4Summary,
    tier3: tier3Summary,
    jackpotRolloverMinor,
  };

  return {
    drawnNumbers,
    activeSubscriberCount: subscribers.length,
    poolTotalMinor,
    jackpotCarryInMinor,
    tier5PoolMinor,
    tier4PoolMinor,
    tier3PoolMinor,
    jackpotRolloverMinor,
    entries: entryResults,
    winners,
    simulation,
  };
}
