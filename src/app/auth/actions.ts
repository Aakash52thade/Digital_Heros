"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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
      error: parse.error.errors.map((e) => e.message).join(", "),
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

  // Determine redirect based on database role
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

/**
 * Server action to register a new user with full name, email, and password.
 */
export async function signupAction(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const parse = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parse.success) {
    return {
      error: parse.error.errors.map((e) => e.message).join(", "),
    };
  }

  const { fullName, email, password } = parse.data;
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

  // If Supabase has email confirmation disabled, user session is active immediately
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
