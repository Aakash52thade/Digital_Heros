"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const updateNameSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters"),
});

export interface SettingsActionState {
  error?: string;
  success?: string;
}

export async function updateNameAction(
  prevState: SettingsActionState | undefined,
  formData: FormData
): Promise<SettingsActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update settings." };
  }

  const parse = updateNameSchema.safeParse({
    fullName: formData.get("fullName"),
  });

  if (!parse.success) {
    return {
      error: parse.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parse.data.fullName })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { success: "Full name updated successfully!" };
}
