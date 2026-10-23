import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { FeaturedCharity } from "@/components/featured-charity";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center bg-background">
      <div className="max-w-3xl space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-muted text-primary">
          Play with Purpose
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-foreground font-heading">
          Digital Heroes
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Track your golf scores, take part in exciting monthly prize draws,
          and give back to life-changing charitable causes with every subscription.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          {user ? (
            <Button asChild size="lg" variant="accent">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" variant="accent">
                <Link href="/signup">Sign Up</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Log In</Link>
              </Button>
            </>
          )}
          <Button asChild size="lg" variant="ghost">
            <Link href="/charities">Explore Charities</Link>
          </Button>
        </div>

        {/* Featured Charity Spotlight */}
        <div className="pt-8">
          <FeaturedCharity />
        </div>
      </div>
    </main>
  );
}
