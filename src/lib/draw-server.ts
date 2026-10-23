import { createAdminClient } from "@/lib/supabase/admin";
import { monthlyEquivalentMinor } from "@/lib/charity";
import {
  runDraw,
  Entry,
  PoolSettings,
  RunDrawResult,
  TierResult,
} from "@/lib/draw";

/** Shape stored in draws.simulation and consumed by /admin/draws page. */
export interface CompactSimulation {
  numbers: number[];
  activeSubscriberCount: number;
  eligibleEntriesCount: number;
  poolTotalMinor: number;
  jackpotCarryInMinor: number;
  tier5: { pool: number; winnersCount: number; prizeEach: number; leftover: number };
  tier4: { pool: number; winnersCount: number; prizeEach: number; leftover: number };
  tier3: { pool: number; winnersCount: number; prizeEach: number; leftover: number };
  jackpotRolloverMinor: number;
}

export interface DrawInputs {
  monthlyEquivalentsMinor: number[];
  entries: Entry[];
  settings: PoolSettings;
  jackpotCarryInMinor: number;
}

/** Converts a TierResult into the compact shape expected by the admin page. */
function tierSummary(t: TierResult) {
  return {
    pool: t.poolMinor,
    winnersCount: t.winnerIds.length,
    prizeEach: t.prizeEachMinor,
    leftover: t.leftoverMinor,
  };
}

/** Builds the compact simulation summary from a RunDrawResult. */
function buildSimulation(
  result: RunDrawResult,
  eligibleEntriesCount: number
): CompactSimulation {
  const [t5, t4, t3] = result.outcome.tiers;
  return {
    numbers: result.drawnNumbers,
    activeSubscriberCount: result.activeSubscriberCount,
    eligibleEntriesCount,
    poolTotalMinor: result.poolTotalMinor,
    jackpotCarryInMinor: result.jackpotCarryInMinor,
    tier5: tierSummary(t5),
    tier4: tierSummary(t4),
    tier3: tierSummary(t3),
    jackpotRolloverMinor: result.outcome.jackpotRolloverMinor,
  };
}

/**
 * Loads all inputs for a draw:
 * 1. Active subscribers (status = 'active', current_period_end > now()) with their monthly-equivalent plan fee
 * 2. Eligible entries = active subscribers with exactly 5 scores
 * 3. Platform settings (pool & tier percentages)
 * 4. Jackpot carry-in from latest published draw with earlier month
 */
export async function loadDrawInputs(month: string): Promise<DrawInputs> {
  const adminClient = createAdminClient();
  const nowIso = new Date().toISOString();

  // 1. Fetch active subscriptions with plans
  const { data: subs, error: subsError } = await adminClient
    .from("subscriptions")
    .select("user_id, status, current_period_end, plans(price_minor, interval)")
    .eq("status", "active")
    .gt("current_period_end", nowIso);

  if (subsError) {
    throw new Error(`Failed to load subscriptions: ${subsError.message}`);
  }

  const monthlyEquivalentsMinor: number[] = [];
  const activeUserIds = new Set<string>();

  for (const sub of subs || []) {
    if (activeUserIds.has(sub.user_id)) continue;
    activeUserIds.add(sub.user_id);

    const plan = sub.plans as unknown as { price_minor: number; interval: string } | null;
    if (plan) {
      monthlyEquivalentsMinor.push(monthlyEquivalentMinor(plan));
    }
  }

  // 2. Fetch scores for eligible users (active subscribers only)
  const entries: Entry[] = [];
  if (activeUserIds.size > 0) {
    const { data: scoresData, error: scoresError } = await adminClient
      .from("scores")
      .select("user_id, score")
      .in("user_id", Array.from(activeUserIds))
      .order("played_on", { ascending: false });

    if (scoresError) {
      throw new Error(`Failed to load scores: ${scoresError.message}`);
    }

    const scoresByUser: Record<string, number[]> = {};
    for (const row of scoresData || []) {
      if (!scoresByUser[row.user_id]) {
        scoresByUser[row.user_id] = [];
      }
      scoresByUser[row.user_id].push(row.score);
    }

    // Only entries with exactly 5 scores per SPEC A5
    for (const [userId, userScores] of Object.entries(scoresByUser)) {
      if (userScores.length === 5) {
        entries.push({ userId, scores: userScores });
      }
    }
  }

  // 3. Platform settings — map snake_case DB columns to camelCase PoolSettings
  const { data: ps, error: settingsError } = await adminClient
    .from("platform_settings")
    .select("prize_pool_percent, tier5_percent, tier4_percent, tier3_percent")
    .eq("id", 1)
    .single();

  if (settingsError || !ps) {
    throw new Error("Failed to load platform settings");
  }

  const settings: PoolSettings = {
    prizePoolPercent: ps.prize_pool_percent,
    tier5Percent: ps.tier5_percent,
    tier4Percent: ps.tier4_percent,
    tier3Percent: ps.tier3_percent,
  };

  // 4. Jackpot carry-in from latest published draw with earlier month per A18
  const { data: lastPublished } = await adminClient
    .from("draws")
    .select("jackpot_rollover_minor")
    .eq("status", "published")
    .lt("month", month)
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();

  const jackpotCarryInMinor = lastPublished?.jackpot_rollover_minor ?? 0;

  return {
    monthlyEquivalentsMinor,
    entries,
    settings,
    jackpotCarryInMinor,
  };
}

/**
 * Simulates a draw for the given month and mode.
 * Upserts draft draws row (throws if already published).
 * Generates fresh numbers, runs draw, saves compact simulation jsonb.
 */
export async function simulateDraw(
  month: string,
  mode: "random" | "algorithmic"
): Promise<CompactSimulation> {
  const adminClient = createAdminClient();

  // Guard: check if already published
  const { data: existing } = await adminClient
    .from("draws")
    .select("id, status")
    .eq("month", month)
    .maybeSingle();

  if (existing && existing.status === "published") {
    throw new Error(`Draw for month ${month} is already published and cannot be modified`);
  }

  const inputs = await loadDrawInputs(month);
  const result = runDraw({
    mode,
    monthlyEquivalentsMinor: inputs.monthlyEquivalentsMinor,
    entries: inputs.entries,
    settings: inputs.settings,
    jackpotCarryInMinor: inputs.jackpotCarryInMinor,
  });

  const simulation = buildSimulation(result, inputs.entries.length);

  // Save compact simulation jsonb and drawn_numbers into draws table (status draft)
  const { error: upsertError } = await adminClient.from("draws").upsert(
    {
      month,
      mode,
      status: "draft",
      drawn_numbers: result.drawnNumbers,
      active_subscriber_count: result.activeSubscriberCount,
      pool_total_minor: result.poolTotalMinor,
      jackpot_carry_in_minor: result.jackpotCarryInMinor,
      tier5_pool_minor: result.pools.tier5,
      tier4_pool_minor: result.pools.tier4,
      tier3_pool_minor: result.pools.tier3,
      jackpot_rollover_minor: result.outcome.jackpotRolloverMinor,
      simulation,
    },
    { onConflict: "month" }
  );

  if (upsertError) {
    throw new Error(`Failed to save simulation: ${upsertError.message}`);
  }

  return simulation;
}

/**
 * Publishes a draw using publish_draw RPC:
 * Recalculates live entries, pools, and winners using the stored drawn numbers.
 */
export async function publishDraw(drawId: string) {
  const adminClient = createAdminClient();

  // Load existing draft
  const { data: draw, error: drawError } = await adminClient
    .from("draws")
    .select("id, month, mode, status, drawn_numbers, simulation")
    .eq("id", drawId)
    .single();

  if (drawError || !draw) {
    throw new Error("Draw not found");
  }

  if (draw.status !== "draft") {
    throw new Error("Draw is not in draft status");
  }

  if (!draw.drawn_numbers || draw.drawn_numbers.length !== 5) {
    throw new Error("No simulated drawn numbers found for this draw");
  }

  const inputs = await loadDrawInputs(draw.month);

  // Run draw locking in the simulated numbers per A17
  const result = runDraw({
    mode: draw.mode as "random" | "algorithmic",
    monthlyEquivalentsMinor: inputs.monthlyEquivalentsMinor,
    entries: inputs.entries,
    settings: inputs.settings,
    jackpotCarryInMinor: inputs.jackpotCarryInMinor,
    drawnNumbers: draw.drawn_numbers,
  });

  // Flatten winners from outcome.tiers (each tier has winnerIds and prizeEachMinor)
  const winners = result.outcome.tiers.flatMap((t) =>
    t.winnerIds.map((userId) => ({
      user_id: userId,
      tier: t.tier,
      prize_minor: t.prizeEachMinor,
    }))
  );

  // Build payload for RPC publish_draw — keys must match the SQL function exactly
  const payload = {
    drawn_numbers: result.drawnNumbers,
    active_subscriber_count: result.activeSubscriberCount,
    pool_total_minor: result.poolTotalMinor,
    jackpot_carry_in_minor: result.jackpotCarryInMinor,
    tier5_pool_minor: result.pools.tier5,
    tier4_pool_minor: result.pools.tier4,
    tier3_pool_minor: result.pools.tier3,
    jackpot_rollover_minor: result.outcome.jackpotRolloverMinor,
    entries: result.outcome.entries.map((e) => ({
      user_id: e.userId,
      scores_snapshot: e.scores,
      match_count: e.matchCount,
    })),
    winners,
  };

  const { error: rpcError } = await adminClient.rpc("publish_draw", {
    p_draw_id: drawId,
    p_payload: payload,
  });

  if (rpcError) {
    throw new Error(`publish_draw RPC failed: ${rpcError.message}`);
  }

  return { success: true };
}
