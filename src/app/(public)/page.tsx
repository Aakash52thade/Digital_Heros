import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FeaturedCharity } from "@/components/featured-charity";
import { Reveal, Stagger, StaggerItem, CountUp } from "@/components/motion";

export const revalidate = 300;

export const metadata = {
  title: "Digital Heroes — Play, Win, Give Back",
  description:
    "A charity-first golf subscription. Track your Stableford scores, take part in monthly prize draws, and give back to causes that matter.",
};

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Subscribe",
    body: "Choose a monthly or yearly plan. Part of every fee goes directly to your chosen charity.",
  },
  {
    step: "02",
    title: "Submit Your Scores",
    body: "Log up to 5 Stableford scores each month. Your latest 5 are kept automatically.",
  },
  {
    step: "03",
    title: "Enter the Draw",
    body: "Every active subscriber with 5 scores enters the monthly draw. The more numbers you match, the bigger your tier prize.",
  },
  {
    step: "04",
    title: "Give Back",
    body: "10–50% of your subscription goes to your chosen charity every single month. No hidden fees.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Run all initial queries in parallel via Promise.all
  const [
    { data: { user } },
    reportResult,
    charitiesCountResult,
    { data: settings },
    { data: plans },
    { data: charityCards },
  ] = await Promise.all([
    supabase.auth.getUser(),
    adminClient.rpc("admin_report"),
    adminClient.from("charities").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("platform_settings").select("tier5_percent, tier4_percent, tier3_percent").single(),
    supabase.from("plans").select("key, name, price_minor, interval").eq("is_active", true),
    supabase.from("charities").select("id, name, slug, description, image_url, category").eq("is_active", true).order("created_at", { ascending: false }).limit(3),
  ]);

  // 1. Live stats via admin_report RPC
  let totalGivenRupees = 0;
  let activeSubscribersCount = 0;
  let activeCharitiesCount = charitiesCountResult.count || 0;

  if (reportResult.data) {
    const subMinor = Number(reportResult.data.charity_subscription_minor || 0);
    const donMinor = Number(reportResult.data.charity_donations_minor || 0);
    totalGivenRupees = Math.floor((subMinor + donMinor) / 100);
    activeSubscribersCount = Number(reportResult.data.active_subscribers || 0);
  }

  // 2. Platform settings for tiers
  const tier5Pct = settings?.tier5_percent ?? 40;
  const tier4Pct = settings?.tier4_percent ?? 35;
  const tier3Pct = settings?.tier3_percent ?? 25;

  // 3. Plans for pricing
  const monthlyPlan = plans?.find((p) => p.key === "monthly");
  const yearlyPlan = plans?.find((p) => p.key === "yearly");

  const monthlyMinor = monthlyPlan?.price_minor || 49900;
  const yearlyMinor = yearlyPlan?.price_minor || 499000;
  const yearlySavingPct = Math.round(
    100 - (yearlyMinor / (monthlyMinor * 12)) * 100
  );

  return (
    <main className="flex flex-col overflow-hidden">
      {/* ─── Hero ─── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-20 sm:py-32 bg-background overflow-hidden">
        {/* Abstract gentle background glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl"
        />

        <Reveal className="relative max-w-3xl space-y-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-widest rounded-full bg-accent/10 text-accent border border-accent/20">
            Charity-First Golf Platform
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground font-heading leading-[1.1]">
            Play Golf. <span className="text-primary">Win Prizes.</span>
            <br />
            Change Lives.
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Digital Heroes is a charity-first membership for golfers. Every subscription fuels real community impact — transparent prize pools and direct donations.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {user ? (
              <Button asChild size="lg" variant="accent" className="hover:-translate-y-0.5 transition-transform">
                <Link href="/dashboard">Go to Dashboard →</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" variant="accent" className="hover:-translate-y-0.5 transition-transform">
                  <Link href="/subscribe">Subscribe Now</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Log In</Link>
                </Button>
              </>
            )}
            <Button asChild size="lg" variant="ghost">
              <Link href="/how-it-works">How It Works</Link>
            </Button>
          </div>
        </Reveal>
      </section>

      {/* ─── Live Stats Ribbon ─── */}
      <section className="border-y border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Reveal className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold font-heading text-primary">
                <CountUp value={totalGivenRupees} prefix="₹" />
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Total Given to Charities
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold font-heading text-primary">
                <CountUp value={activeSubscribersCount} />
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Active Member Heroes
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold font-heading text-primary">
                <CountUp value={activeCharitiesCount} />
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Vetted Charity Partners
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 px-6 bg-background">
        <div className="max-w-5xl mx-auto space-y-12">
          <Reveal className="text-center space-y-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Simple by Design
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-foreground">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
              Four clear steps from subscription to meaningful community impact.
            </p>
          </Reveal>

          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((item) => (
              <StaggerItem key={item.step}>
                <Card className="h-full border-border bg-card hover:-translate-y-1 hover:shadow-md transition-all">
                  <CardContent className="pt-6 space-y-3">
                    <span className="text-4xl font-extrabold font-heading text-primary/20 leading-none select-none">
                      {item.step}
                    </span>
                    <h3 className="text-lg font-bold text-foreground font-heading">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.body}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ─── Prize Tiers Explainer ─── */}
      <section className="py-16 px-6 bg-card border-y border-border">
        <div className="max-w-4xl mx-auto space-y-8">
          <Reveal className="text-center space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Fair & Rewarding
            </span>
            <h2 className="text-3xl font-extrabold font-heading text-foreground">
              Monthly Prize Tiers
            </h2>
            <p className="text-sm text-muted-foreground">
              50% of subscriber fees form the monthly prize pool, divided across three distinct winning tiers.
            </p>
          </Reveal>

          <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StaggerItem>
              <div className="rounded-xl border border-border p-6 space-y-2 text-center bg-background hover:-translate-y-1 hover:shadow-md transition-all">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">Tier 5</p>
                <p className="text-3xl font-extrabold font-heading text-foreground">{tier5Pct}%</p>
                <p className="text-xs text-muted-foreground">of monthly prize pool</p>
                <p className="text-sm font-medium text-foreground pt-1">Match 5 Numbers</p>
                <p className="text-[11px] text-muted-foreground">Rolls over if unclaimed</p>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="rounded-xl border border-border p-6 space-y-2 text-center bg-background hover:-translate-y-1 hover:shadow-md transition-all">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Tier 4</p>
                <p className="text-3xl font-extrabold font-heading text-foreground">{tier4Pct}%</p>
                <p className="text-xs text-muted-foreground">of monthly prize pool</p>
                <p className="text-sm font-medium text-foreground pt-1">Match 4 Numbers</p>
                <p className="text-[11px] text-muted-foreground">Split equally among tier winners</p>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="rounded-xl border border-border p-6 space-y-2 text-center bg-background hover:-translate-y-1 hover:shadow-md transition-all">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tier 3</p>
                <p className="text-3xl font-extrabold font-heading text-foreground">{tier3Pct}%</p>
                <p className="text-xs text-muted-foreground">of monthly prize pool</p>
                <p className="text-sm font-medium text-foreground pt-1">Match 3 Numbers</p>
                <p className="text-[11px] text-muted-foreground">Split equally among tier winners</p>
              </div>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      {/* ─── Pricing Section ─── */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto space-y-10">
          <Reveal className="text-center space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              Membership
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-foreground">
              Choose Your Plan
            </h2>
            <p className="text-sm text-muted-foreground">
              10% to 50% of your membership directly funds your selected charity.
            </p>
          </Reveal>

          <Stagger className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Monthly */}
            <StaggerItem>
              <Card className="h-full flex flex-col justify-between border-border bg-card hover:-translate-y-1 hover:shadow-md transition-all">
                <CardHeader>
                  <CardTitle className="text-xl">Monthly Hero</CardTitle>
                  <CardDescription>Full flexibility, billed monthly</CardDescription>
                  <div className="pt-4">
                    <span className="text-4xl font-extrabold font-heading text-foreground">
                      ₹{Math.floor(monthlyMinor / 100)}
                    </span>
                    <span className="text-sm text-muted-foreground"> / month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>✓ 1 monthly prize draw entry</p>
                  <p>✓ Minimum 10% to chosen charity</p>
                  <p>✓ Cancel anytime in billing portal</p>
                </CardContent>
                <CardFooter className="pt-4">
                  <Button asChild variant="accent" className="w-full">
                    <Link href="/subscribe">Subscribe Monthly</Link>
                  </Button>
                </CardFooter>
              </Card>
            </StaggerItem>

            {/* Yearly */}
            <StaggerItem>
              <Card className="h-full flex flex-col justify-between border-primary/40 bg-card relative hover:-translate-y-1 hover:shadow-md transition-all">
                <div className="absolute -top-3 right-4 bg-accent text-accent-foreground text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Save {yearlySavingPct}%
                </div>
                <CardHeader>
                  <CardTitle className="text-xl">Yearly Hero</CardTitle>
                  <CardDescription>Best value for committed golfers</CardDescription>
                  <div className="pt-4">
                    <span className="text-4xl font-extrabold font-heading text-foreground">
                      ₹{Math.floor(yearlyMinor / 100)}
                    </span>
                    <span className="text-sm text-muted-foreground"> / year</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>✓ 12 monthly prize draws included</p>
                  <p>✓ Continuous charitable impact</p>
                  <p>✓ 2 months free equivalent savings</p>
                </CardContent>
                <CardFooter className="pt-4">
                  <Button asChild variant="accent" className="w-full">
                    <Link href="/subscribe">Subscribe Yearly</Link>
                  </Button>
                </CardFooter>
              </Card>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      {/* ─── Featured & Partner Charities ─── */}
      <section className="py-20 px-6 bg-card border-t border-border">
        <div className="max-w-5xl mx-auto space-y-12">
          <Reveal className="text-center space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Our Community
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-foreground">
              Partner Charities
            </h2>
            <p className="text-sm text-muted-foreground">
              Support real causes working on education, animal welfare, and healthcare.
            </p>
          </Reveal>

          <Reveal>
            <FeaturedCharity />
          </Reveal>

          {charityCards && charityCards.length > 0 && (
            <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
              {charityCards.map((c) => (
                <StaggerItem key={c.id}>
                  <Card className="h-full flex flex-col justify-between border-border overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all">
                    <div>
                      {c.image_url && (
                        <div className="h-40 w-full bg-muted overflow-hidden">
                          <img
                            src={c.image_url}
                            alt={c.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        {c.category && (
                          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                            {c.category}
                          </span>
                        )}
                        <CardTitle className="text-lg line-clamp-1">{c.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {c.description}
                        </p>
                      </CardContent>
                    </div>
                    <CardFooter className="pt-2 border-t border-border/50">
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href={`/charities/${c.slug}`}>Learn & Donate</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </StaggerItem>
              ))}
            </Stagger>
          )}

          <div className="text-center pt-2">
            <Button asChild variant="outline">
              <Link href="/charities">Browse All Causes →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-20 px-6 bg-primary text-primary-foreground relative overflow-hidden">
        <Reveal className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold font-heading">
            Make every score count.
          </h2>
          <p className="text-primary-foreground/80 text-base sm:text-lg max-w-xl mx-auto">
            Join Digital Heroes today. Transparent draws, fair odds, and meaningful giving with every round.
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-2">
            {user ? (
              <Button asChild size="lg" variant="accent">
                <Link href="/dashboard">View Dashboard →</Link>
              </Button>
            ) : (
              <Button asChild size="lg" variant="accent">
                <Link href="/subscribe">Subscribe Now</Link>
              </Button>
            )}
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link href="/charities">Explore Charities</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
