"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActiveSubscription } from "@/lib/subscription";
import { scoreInputSchema, editScoreInputSchema } from "@/lib/scores";

export interface ScoreActionState {
  error?: string;
  success?: string;
}

/**
 * Friendly error translator for Postgres error codes and trigger exceptions.
 */
function formatScoreError(error: { code?: string; message: string }): string {
  if (error.code === "23505" || error.message.includes("unique")) {
    return "You already have a score for this date. Edit it instead.";
  }
  if (
    error.message.includes("older than") ||
    error.message.includes("oldest of the 5")
  ) {
    return "This score date is older than your 5 existing scores. Only newer scores can be entered.";
  }
  return error.message || "Failed to save score. Please try again.";
}

/**
 * Server action to add a new score (1-45, max date today IST, active subscribers only).
 */
export async function addScoreAction(
  prevState: ScoreActionState | undefined,
  formData: FormData
): Promise<ScoreActionState> {
  const { user } = await requireActiveSubscription();

  const parse = scoreInputSchema.safeParse({
    score: formData.get("score"),
    playedOn: formData.get("playedOn"),
  });

  if (!parse.success) {
    return {
      error: parse.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { score, playedOn } = parse.data;
  const supabase = await createClient();

  const { error } = await supabase.from("scores").insert({
    user_id: user.id,
    score,
    played_on: playedOn,
  });

  if (error) {
    return { error: formatScoreError(error) };
  }

  revalidatePath("/dashboard/scores");
  return { success: "Score recorded successfully!" };
}

/**
 * Server action to edit an existing score.
 */
export async function editScoreAction(
  prevState: ScoreActionState | undefined,
  formData: FormData
): Promise<ScoreActionState> {
  const { user } = await requireActiveSubscription();

  const parse = editScoreInputSchema.safeParse({
    id: formData.get("id"),
    score: formData.get("score"),
    playedOn: formData.get("playedOn"),
  });

  if (!parse.success) {
    return {
      error: parse.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id, score, playedOn } = parse.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("scores")
    .update({
      score,
      played_on: playedOn,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: formatScoreError(error) };
  }

  revalidatePath("/dashboard/scores");
  return { success: "Score updated successfully!" };
}

/**
 * Server action to delete an existing score.
 */
export async function deleteScoreAction(formData: FormData) {
  const { user } = await requireActiveSubscription();

  const id = formData.get("id");
  const parse = z.string().uuid().safeParse(id);

  if (!parse.success) {
    throw new Error("Invalid score ID");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("scores")
    .delete()
    .eq("id", parse.data)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/scores");
}
