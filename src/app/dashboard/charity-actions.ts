"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCharityPercentRange, validateAndClampCharityPercent } from "@/lib/charity";

const updateCharitySchema = z.object({
  charityId: z.string().uuid("Please select a valid charity"),
  charityPercent: z.coerce.number().int("Charity percentage must be an integer"),
});

export interface CharityActionState {
  error?: string;
  success?: string;
}

/**
 * Server action to update user's supported charity and contribution percentage (A15 & A16).
 */
export async function updateCharitySettingsAction(
  prevState: CharityActionState | undefined,
  formData: FormData
): Promise<CharityActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to update your charity settings." };
  }

  const parse = updateCharitySchema.safeParse({
    charityId: formData.get("charityId"),
    charityPercent: formData.get("charityPercent"),
  });

  if (!parse.success) {
    return {
      error: parse.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { charityId, charityPercent } = parse.data;

  // 1. Verify charity is active
  const { data: charity } = await supabase
    .from("charities")
    .select("id, name")
    .eq("id", charityId)
    .eq("is_active", true)
    .maybeSingle();

  if (!charity) {
    return { error: "The selected charity is invalid or inactive." };
  }

  // 2. Fetch platform_settings for bounds
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("min_charity_percent, prize_pool_percent")
    .eq("id", 1)
    .single();

  const settingsConfig = {
    min_charity_percent: settings?.min_charity_percent ?? 10,
    prize_pool_percent: settings?.prize_pool_percent ?? 50,
  };

  const { min, max } = getCharityPercentRange(settingsConfig);
  if (charityPercent < min || charityPercent > max) {
    return {
      error: `Percentage must be between ${min}% and ${max}%.`,
    };
  }

  const validPercent = validateAndClampCharityPercent(
    charityPercent,
    settingsConfig
  );

  // 3. Update profiles table
  const { error } = await supabase
    .from("profiles")
    .update({
      charity_id: charity.id,
      charity_percent: validPercent,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: `Successfully updated charity to ${charity.name} (${validPercent}%)!` };
}
