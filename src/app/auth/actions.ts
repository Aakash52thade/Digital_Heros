"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCharityPercentRange, validateAndClampCharityPercent } from "@/lib/charity";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  charityId: z.string().uuid("Please select a valid charity"),
  charityPercent: z.coerce.number().int("Charity percentage must be an integer"),
});

export type ActionState = {
  error?: string;
  success?: string;
};

/**
 * Server action to authenticate an existing user and route to appropriate destination.
 */
export async function loginAction(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const parse = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parse.success) {
    return {
      error: parse.error.issues.map((e) => e.message).join(", "),
    };
  }

  const { email, password } = parse.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Authentication failed. User not found." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const redirectTo = (formData.get("redirectTo") as string) || "";

  if (profile?.role === "admin") {
    redirect(redirectTo && redirectTo.startsWith("/admin") ? redirectTo : "/admin");
  } else {
    redirect(redirectTo && redirectTo.startsWith("/dashboard") ? redirectTo : "/dashboard");
  }
}

/**
 * Server action to register a new user with required charity selection and percentage.
 */
export async function signupAction(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const parse = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    charityId: formData.get("charityId"),
    charityPercent: formData.get("charityPercent"),
  });

  if (!parse.success) {
    return {
      error: parse.error.issues.map((e) => e.message).join(", "),
    };
  }

  const { fullName, email, password, charityId, charityPercent } = parse.data;
  const adminClient = createAdminClient();

  // 1. Validate charity existence & active state
  const { data: charity } = await adminClient
    .from("charities")
    .select("id")
    .eq("id", charityId)
    .eq("is_active", true)
    .maybeSingle();

  if (!charity) {
    return { error: "Selected charity is invalid or inactive." };
  }

  // 2. Validate percentage bounds from platform_settings (SPEC A16)
  const { data: settings } = await adminClient
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
      error: `Charity percentage must be between ${min}% and ${max}%.`,
    };
  }

  const validPercent = validateAndClampCharityPercent(
    charityPercent,
    settingsConfig
  );

  // 3. Create auth user
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "subscriber",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    // 4. Update profile with charity choices using admin client
    await adminClient
      .from("profiles")
      .update({
        charity_id: charity.id,
        charity_percent: validPercent,
      })
      .eq("id", data.user.id);
  }

  if (data.session && data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "admin") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  return {
    success:
      "Account registered successfully! If email verification is enabled, please check your inbox.",
  };
}

/**
 * Server action to sign out user and redirect to login page.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
