"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { syncSubscriptionFromStripe } from "@/lib/subscription";
import { scoreInputSchema, editScoreInputSchema } from "@/lib/scores";

const updateProfileSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  charityId: z.string().uuid("Invalid charity ID"),
  charityPercent: z.coerce.number().int().min(10).max(50),
});

export async function updateUserProfileAction(
  prevState: unknown,
  formData: FormData
) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();

    const validated = updateProfileSchema.parse({
      userId: formData.get("userId"),
      fullName: formData.get("fullName"),
      charityId: formData.get("charityId"),
      charityPercent: formData.get("charityPercent"),
    });

    // Explicitly exclude role to adhere to A21
    const { error } = await adminClient
      .from("profiles")
      .update({
        full_name: validated.fullName,
        charity_id: validated.charityId,
        charity_percent: validated.charityPercent,
      })
      .eq("id", validated.userId);

    if (error) throw new Error(error.message);

    revalidatePath(`/admin/users/${validated.userId}`);
    revalidatePath("/admin/users");
    return { success: "User profile updated successfully!", error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    return { success: null, error: message };
  }
}

export async function addAdminScoreAction(
  prevState: unknown,
  formData: FormData
) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();

    const userId = formData.get("userId") as string;
    const validated = scoreInputSchema.parse({
      score: formData.get("score"),
      playedOn: formData.get("playedOn"),
    });

    const { error } = await adminClient.from("scores").insert({
      user_id: userId,
      score: validated.score,
      played_on: validated.playedOn,
    });

    if (error) {
      if (error.code === "23505" || error.message.includes("unique")) {
        throw new Error("A score already exists for this date.");
      }
      if (error.message.includes("older than") || error.message.includes("oldest of the 5")) {
        throw new Error("Score date is older than existing 5 scores.");
      }
      throw new Error(error.message);
    }

    revalidatePath(`/admin/users/${userId}`);
    return { success: "Score added successfully!", error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add score";
    return { success: null, error: message };
  }
}

export async function editAdminScoreAction(
  prevState: unknown,
  formData: FormData
) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();

    const userId = formData.get("userId") as string;
    const validated = editScoreInputSchema.parse({
      id: formData.get("id"),
      score: formData.get("score"),
      playedOn: formData.get("playedOn"),
    });

    const { error } = await adminClient
      .from("scores")
      .update({
        score: validated.score,
        played_on: validated.playedOn,
      })
      .eq("id", validated.id)
      .eq("user_id", userId);

    if (error) {
      if (error.code === "23505") throw new Error("A score already exists for this date.");
      throw new Error(error.message);
    }

    revalidatePath(`/admin/users/${userId}`);
    return { success: "Score updated successfully!", error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to edit score";
    return { success: null, error: message };
  }
}

export async function deleteAdminScoreAction(formData: FormData) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const id = formData.get("id") as string;
  const userId = formData.get("userId") as string;

  const { error } = await adminClient
    .from("scores")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/users/${userId}`);
}

export async function cancelSubscriptionAction(formData: FormData) {
  await requireAdmin();

  const stripeSubscriptionId = formData.get("stripeSubscriptionId") as string;
  const userId = formData.get("userId") as string;
  const immediate = formData.get("immediate") === "true";

  if (!stripeSubscriptionId) throw new Error("Missing subscription ID");

  if (immediate) {
    await stripe.subscriptions.cancel(stripeSubscriptionId);
  } else {
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  await syncSubscriptionFromStripe(stripeSubscriptionId);
  revalidatePath(`/admin/users/${userId}`);
}

export async function resumeSubscriptionAction(formData: FormData) {
  await requireAdmin();

  const stripeSubscriptionId = formData.get("stripeSubscriptionId") as string;
  const userId = formData.get("userId") as string;

  if (!stripeSubscriptionId) throw new Error("Missing subscription ID");

  await stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  await syncSubscriptionFromStripe(stripeSubscriptionId);
  revalidatePath(`/admin/users/${userId}`);
}
