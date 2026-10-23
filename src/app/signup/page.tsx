import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCharityPercentRange } from "@/lib/charity";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Sign Up - Digital Heroes",
};

interface SignupPageProps {
  searchParams?: {
    charity?: string;
  };
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  // Fetch active charities
  const { data: charities } = await supabase
    .from("charities")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name", { ascending: true });

  // Fetch platform settings for charity percentage limits
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

  const activeCharities = charities || [];
  const preselected = activeCharities.find((c) => c.slug === searchParams?.charity);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <SignupForm
          charities={activeCharities}
          minPercent={min}
          maxPercent={max}
          preselectedCharityId={preselected?.id}
        />
      </div>
    </main>
  );
}
