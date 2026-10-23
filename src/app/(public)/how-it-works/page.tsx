import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";

export const metadata = {
  title: "How It Works — Digital Heroes",
  description:
    "Learn about our 5-number draw engine, match calculations, prize tier splits, jackpot rollovers, and scorecard verification.",
};

export default async function HowItWorksPage() {
  const supabase = await createClient();

  // Fetch latest published draw
  const { data: latestDraw } = await supabase
    .from("draws")
    .select("month, drawn_numbers, active_subscriber_count, pool_total_minor")
    .eq("status", "published")
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-background py-16 px-6">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <Reveal className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-widest rounded-full bg-primary/10 text-primary border border-primary/20">
            Transparent Rules
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold font-heading text-foreground">
            How Digital Heroes Works
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            From submitting your 5 monthly golf scores to fair prize distributions and audited charity donations.
          </p>
        </Reveal>

        {/* Latest Draw Banner */}
        <Reveal>
          <Card className="border-primary/30 bg-card overflow-hidden">
            <CardHeader className="bg-primary/5 pb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Latest Results
              </span>
              <CardTitle className="text-xl">
                {latestDraw ? `Draw Results — ${latestDraw.month}` : "Monthly Draw Status"}
              </CardTitle>
              <CardDescription>
                {latestDraw
                  ? `${latestDraw.active_subscriber_count} eligible players participated.`
                  : "First official draw coming soon for active members."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {latestDraw && latestDraw.drawn_numbers ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">Drawn Numbers:</span>
                  <div className="flex gap-2">
                    {latestDraw.drawn_numbers.map((n: number, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent text-accent-foreground font-extrabold text-sm"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Our inaugural monthly prize draw takes place at the end of the month. Enter your 5 Stableford scores to qualify!
                </p>
              )}
            </CardContent>
          </Card>
        </Reveal>

        {/* The Rules Breakdown */}
        <Stagger className="space-y-6">
          <StaggerItem>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl">1. The 5 Drawn Numbers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                <p>
                  Each month, the platform draws 5 distinct integer numbers between 1 and 45. In algorithmic mode, numbers are weighted by participant popularity so active member selections have dynamic chances.
                </p>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl">2. Eligible Scores & Match Count</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                <p>
                  To be eligible for a draw, a member must have an <strong>active subscription</strong> and exactly <strong>5 scores</strong> logged in the system.
                </p>
                <p>
                  Your match count equals how many of the 5 drawn numbers appear in your 5 scores. Only <strong>distinct values</strong> are counted — each drawn number counts once.
                </p>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl">3. Prize Tiers & Equal Sharing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>
                  50% of subscriber fees fund the monthly prize pool, split across three winning tiers:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Tier 5 (5 matches):</strong> 40% of the prize pool.</li>
                  <li><strong>Tier 4 (4 matches):</strong> 35% of the prize pool.</li>
                  <li><strong>Tier 3 (3 matches):</strong> 25% of the prize pool.</li>
                </ul>
                <p>
                  Prizes are split equally among all winners in that tier, rounded down to the paisa. Unclaimed Tier 5 funds roll over to next month&apos;s jackpot! Unclaimed Tier 4 and 3 remain with the platform.
                </p>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-xl">4. Winner Verification by Scorecard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                <p>
                  Winners are placed in <em>&ldquo;awaiting proof&rdquo;</em> status. To claim a prize, upload a photo or screenshot of your club scorecard. Once verified by our administrators, payouts are disbursed directly. Even if your membership period lapses after winning, you retain access to claim your prize.
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
        </Stagger>

        {/* CTA */}
        <Reveal className="text-center pt-6 space-y-4">
          <Button asChild size="lg" variant="accent">
            <Link href="/subscribe">Join Digital Heroes Today</Link>
          </Button>
          <div>
            <Link href="/charities" className="text-xs text-primary font-medium hover:underline">
              Explore Our Supported Charities →
            </Link>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
