import { redirect } from "next/navigation";
import Link from "next/link";
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
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left panel: Emotional charity message & abstract soft shapes */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-accent/20 blur-3xl"
        />

        <div className="relative z-10">
          <Link href="/" className="font-heading font-extrabold text-2xl tracking-tight text-primary-foreground">
            Digital Heroes
          </Link>
        </div>

        <div className="relative z-10 max-w-md space-y-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent-foreground/90 bg-accent px-2.5 py-1 rounded-full">
            Join the Movement
          </span>
          <h2 className="text-4xl font-extrabold font-heading leading-tight">
            Turn your passion for golf into direct community impact.
          </h2>
          <p className="text-primary-foreground/80 text-sm leading-relaxed">
            Create an account, pick a verified charitable cause, and decide how much of your monthly fee goes to them. Win prizes together, give back together.
          </p>
        </div>

        <div className="relative z-10 text-xs text-primary-foreground/60">
          ₹499/mo standard plan • 10–50% to your charity • Cancel anytime
        </div>
      </div>

      {/* Right panel: Signup form */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="font-heading font-extrabold text-2xl tracking-tight text-foreground">
              Digital Heroes
            </Link>
          </div>
          <SignupForm
            charities={activeCharities}
            minPercent={min}
            maxPercent={max}
            preselectedCharityId={preselected?.id}
          />
        </div>
      </div>
    </main>
  );
}
