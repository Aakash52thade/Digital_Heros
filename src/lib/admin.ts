import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Ensures user is authenticated and has admin role.
 * Throws redirect if not authorized.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return user;
}
