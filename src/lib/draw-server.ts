import { createAdminClient } from "@/lib/supabase/admin";
import { monthlyEquivalentMinor } from "@/lib/charity";
import {
  runDraw,
  DrawEntry,
  SubscriberFee,
  PoolSettings,
  CompactSimulation,
} from "@/lib/draw";

export interface DrawInputs {
  subscribers: SubscriberFee[];
  entries: DrawEntry[];
  settings: PoolSettings;
  jackpotCarryInMinor: number;
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

  const subscribers: SubscriberFee[] = [];
  const activeUserIds = new Set<string>();

  for (const sub of subs || []) {
    if (activeUserIds.has(sub.user_id)) continue;
    activeUserIds.add(sub.user_id);

    const plan = sub.plans as unknown as { price_minor: number; interval: string } | null;
    if (plan) {
      subscribers.push({
        userId: sub.user_id,
        monthlyEquivalentMinor: monthlyEquivalentMinor(plan),
      });
    }
  }

  // 2. Fetch scores for eligible users (active subscribers only)
  const entries: DrawEntry[] = [];
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
        entries.push({
          userId,
          scores: userScores,
        });
      }
    }
  }

  // 3. Platform settings
  const { data: platformSettings, error: settingsError } = await adminClient
    .from("platform_settings")
    .select("prize_pool_percent, tier5_percent, tier4_percent, tier3_percent")
    .eq("id", 1)
    .single();

  if (settingsError || !platformSettings) {
    throw new Error("Failed to load platform settings");
  }

  const settings: PoolSettings = {
    prize_pool_percent: platformSettings.prize_pool_percent,
    tier5_percent: platformSettings.tier5_percent,
    tier4_percent: platformSettings.tier4_percent,
    tier3_percent: platformSettings.tier3_percent,
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
    subscribers,
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
    subscribers: inputs.subscribers,
    entries: inputs.entries,
    settings: inputs.settings,
    jackpotCarryInMinor: inputs.jackpotCarryInMinor,
  });

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
      tier5_pool_minor: result.tier5PoolMinor,
      tier4_pool_minor: result.tier4PoolMinor,
      tier3_pool_minor: result.tier3PoolMinor,
      jackpot_rollover_minor: result.jackpotRolloverMinor,
      simulation: result.simulation,
    },
    { onConflict: "month" }
  );

  if (upsertError) {
    throw new Error(`Failed to save simulation: ${upsertError.message}`);
  }

  return result.simulation;
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
    subscribers: inputs.subscribers,
    entries: inputs.entries,
    settings: inputs.settings,
    jackpotCarryInMinor: inputs.jackpotCarryInMinor,
    fixedNumbers: draw.drawn_numbers,
  });

  // Build payload for RPC publish_draw
  const payload = {
    drawn_numbers: result.drawnNumbers,
    active_subscriber_count: result.activeSubscriberCount,
    pool_total_minor: result.poolTotalMinor,
    jackpot_carry_in_minor: result.jackpotCarryInMinor,
    tier5_pool_minor: result.tier5PoolMinor,
    tier4_pool_minor: result.tier4PoolMinor,
    tier3_pool_minor: result.tier3PoolMinor,
    jackpot_rollover_minor: result.jackpotRolloverMinor,
    entries: result.entries.map((e) => ({
      user_id: e.userId,
      scores_snapshot: e.scoresSnapshot,
      match_count: e.matchCount,
    })),
    winners: result.winners.map((w) => ({
      user_id: w.userId,
      tier: w.tier,
      prize_minor: w.prizeMinor,
    })),
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
