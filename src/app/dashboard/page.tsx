import Link from "next/link";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/auth/actions";
import { openBillingPortal } from "@/app/subscribe/actions";
import { getSubscriptionState, syncSubscriptionFromStripe } from "@/lib/subscription";
import {
  monthlyEquivalentMinor,
  getCharityPercentRange,
  calculateCharityContributionMinor,
} from "@/lib/charity";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CharityCardForm } from "./charity-card-client";

export const metadata = {
  title: "Dashboard - Digital Heroes",
};

interface DashboardPageProps {
  searchParams?: {
    checkout?: string;
    session_id?: string;
  };
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id || "";

  // Direct checkout sync if returning from Stripe
  if (searchParams?.checkout === "success" && searchParams.session_id && userId) {
    let currentState = await getSubscriptionState(userId);
    if (!currentState.active) {
      try {
        const session = await stripe.checkout.sessions.retrieve(
          searchParams.session_id
        );
        if (session.client_reference_id === userId && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          await syncSubscriptionFromStripe(subId);
        }
      } catch (err) {
        console.error("Direct checkout sync error:", err);
      }
    }
  }

  // 1. Fetch subscription state & profile
  const subState = await getSubscriptionState(userId);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, charity_id, charity_percent, charities(id, name, slug)")
    .eq("id", userId)
    .maybeSingle();

  const { data: allCharities } = await supabase
    .from("charities")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const { data: settings } = await supabase
    .from("platform_settings")
    .select("min_charity_percent, prize_pool_percent")
    .eq("id", 1)
    .single();

  const settingsConfig = {
    min_charity_percent: settings?.min_charity_percent ?? 10,
    prize_pool_percent: settings?.prize_pool_percent ?? 50,
  };
  const { min: minPercent, max: maxPercent } = getCharityPercentRange(settingsConfig);

  // Fetch plan price for monthly equivalent
  let monthlyFeeMinor = 49900;
  if (subState.planKey) {
    const { data: planRow } = await supabase
      .from("plans")
      .select("price_minor, interval")
      .eq("key", subState.planKey)
      .maybeSingle();

    if (planRow) {
      monthlyFeeMinor = monthlyEquivalentMinor(planRow);
    }
  }

  const charityPercent = profile?.charity_percent ?? minPercent;
  const charityContributionMinor = calculateCharityContributionMinor(
    monthlyFeeMinor,
    charityPercent
  );

  const rsX = Math.floor(charityContributionMinor / 100);
  const rsY = Math.floor(monthlyFeeMinor / 100);

  const charityRelation = profile?.charities as unknown as {
    id: string;
    name: string;
    slug: string;
  } | null;
  const charityName = charityRelation?.name || "No charity chosen";

  // 2. Fetch User's Latest 5 Scores
  const { data: scoresData } = await supabase
    .from("scores")
    .select("id, score, played_on")
    .eq("user_id", userId)
    .order("played_on", { ascending: false })
    .limit(5);

  const scores = scoresData || [];
  const scoreCount = scores.length;

  // 3. Participation Data: Total draws entered & last 5 entries
  const { count: totalEntriesCount } = await supabase
    .from("draw_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const { data: recentEntriesData } = await supabase
    .from("draw_entries")
    .select("draw_id, match_count, scores_snapshot, draws(month, drawn_numbers, status)")
    .eq("user_id", userId)
    .order("draw_id", { ascending: false })
    .limit(5);

  // 4. Upcoming Draw Month per A20
  // Today in Asia/Kolkata
  const now = new Date();
  const currentMonthIST = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).format(now);
  const currentMonthDate = `${currentMonthIST}-01`;

  // Check if current month draw is published
  const { data: currentMonthDraw } = await supabase
    .from("draws")
    .select("status")
    .eq("month", currentMonthDate)
    .maybeSingle();

  let upcomingDrawMonth = currentMonthIST;
  if (currentMonthDraw && currentMonthDraw.status === "published") {
    // Next month
    const [year, month] = currentMonthIST.split("-").map(Number);
    const nextDate = new Date(Date.UTC(year, month, 1));
    upcomingDrawMonth = nextDate.toISOString().slice(0, 7);
  }

  // Entered status per A20: active subscription AND exactly 5 scores
  const isEntered = subState.active && scoreCount === 5;
  let upcomingStatusReason = "";
  if (!subState.active) {
    upcomingStatusReason = "Subscription inactive";
  } else if (scoreCount < 5) {
    upcomingStatusReason = `Add ${5 - scoreCount} more score${5 - scoreCount === 1 ? "" : "s"}`;
  } else {
    upcomingStatusReason = "Qualified & entered";
  }

  // 5. Winnings summary
  const { data: winnersData } = await supabase
    .from("winners")
    .select("prize_minor, payment_status")
    .eq("user_id", userId);

  let totalWonMinor = 0;
  let pendingWonMinor = 0;
  let paidWonMinor = 0;

  for (const w of winnersData || []) {
    totalWonMinor += w.prize_minor;
    if (w.payment_status === "paid") {
      paidWonMinor += w.prize_minor;
    } else {
      pendingWonMinor += w.prize_minor;
    }
  }

  // Subscription status label
  let statusLabel = "Inactive";
  let statusBadgeClass = "bg-muted text-muted-foreground";

  if (subState.cancelsAtPeriodEnd && subState.renewsOn) {
    const formattedDate = new Date(subState.renewsOn).toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric", year: "numeric" }
    );
    statusLabel = `Cancels on ${formattedDate}`;
    statusBadgeClass = "bg-amber-100 text-amber-900 border border-amber-200";
  } else if (subState.active) {
    statusLabel = "Active";
    statusBadgeClass = "bg-success/15 text-success border border-success/30";
  } else if (subState.status === "past_due") {
    statusLabel = "Past due";
    statusBadgeClass =
      "bg-destructive/15 text-destructive border border-destructive/30";
  }

  const planName =
    subState.planKey === "monthly"
      ? "Monthly Hero"
      : subState.planKey === "yearly"
      ? "Yearly Hero"
      : "No Active Plan";

  const formattedRenewal = subState.renewsOn
    ? new Date(subState.renewsOn).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground">
              Subscriber Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome back to your Digital Heroes portal
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/charities">Charities</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/scores">Scores</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/winnings">Winnings</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/settings">Settings</Link>
            </Button>
            <form action={logoutAction}>
              <Button variant="ghost" type="submit">
                Log Out
              </Button>
            </form>
          </div>
        </header>

        {searchParams?.checkout === "success" && (
          <div className="rounded-md bg-success/10 border border-success/30 p-4 text-sm font-medium text-success">
            Thank you! Your subscription payment was received successfully.
          </div>
        )}

        {/* 5-Module Responsive Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Module (a): Subscription Status */}
          <Card className="border-border flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Membership</CardTitle>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadgeClass}`}
                >
                  {statusLabel}
                </span>
              </div>
              <CardDescription>
                Subscription status & renewal schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Current Plan
                </p>
                <p className="text-base font-medium text-foreground">
                  {planName}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {subState.cancelsAtPeriodEnd
                    ? "Access Until"
                    : "Next Renewal Date"}
                </p>
                <p className="text-base font-medium text-foreground">
                  {formattedRenewal}
                </p>
              </div>
            </CardContent>
            <CardFooter className="pt-2 flex flex-wrap gap-2">
              {!subState.active && (
                <Button asChild variant="default" className="w-full">
                  <Link href="/subscribe">Subscribe Now</Link>
                </Button>
              )}
              {subState.stripeCustomerId && (
                <form action={openBillingPortal} className="w-full">
                  <Button
                    variant={subState.active ? "outline" : "ghost"}
                    className="w-full"
                    type="submit"
                  >
                    Manage Billing
                  </Button>
                </form>
              )}
            </CardFooter>
          </Card>

          {/* Module (b): Golf Scores Overview */}
          <Card className="border-border flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Golf Scores</CardTitle>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {scoreCount} of 5 entered
                </span>
              </div>
              <CardDescription>
                Stableford scores qualifying you for prize draws
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!subState.active ? (
                <div className="rounded-md bg-muted/60 p-4 text-sm text-muted-foreground text-center">
                  Score tracking is locked. An active subscription is required to enter scores.
                </div>
              ) : scores.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No scores recorded yet. Submit 5 scores to enter upcoming draws.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Latest 5 Scores
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {scores.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-sm font-semibold text-foreground border border-border"
                      >
                        {s.score}
                        <span className="text-[10px] text-muted-foreground font-normal">
                          ({s.played_on.slice(5)})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2">
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/scores">Manage Golf Scores</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Module (c): Charity Impact */}
          <Card className="border-border flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Your Charity</CardTitle>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {charityPercent}% of fee
                </span>
              </div>
              <CardDescription>
                Direct impact generated by your subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Supported Charity
                </p>
                <p className="text-base font-semibold text-foreground">
                  {charityName}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Monthly Giving
                </p>
                <p className="text-sm font-medium text-primary">
                  Rs {rsX} of your Rs {rsY} per month goes to {charityName}
                </p>
              </div>
            </CardContent>
            <CardFooter className="pt-2 flex flex-col items-start gap-2">
              <CharityCardForm
                charities={allCharities || []}
                currentCharityId={profile?.charity_id || ""}
                currentCharityPercent={charityPercent}
                minPercent={minPercent}
                maxPercent={maxPercent}
              />
            </CardFooter>
          </Card>

          {/* Module (d): Draw Participation (A20) */}
          <Card className="border-border flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Draw Participation</CardTitle>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isEntered
                      ? "bg-success/15 text-success border border-success/30"
                      : "bg-amber-100 text-amber-900 border border-amber-200"
                  }`}
                >
                  {isEntered ? "Entered" : "Not Entered"}
                </span>
              </div>
              <CardDescription>
                Next draw: {upcomingDrawMonth} ({upcomingStatusReason})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Total Draws Entered
                </p>
                <p className="text-base font-bold text-foreground">
                  {totalEntriesCount ?? 0}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Recent Draws
                </p>
                {(!recentEntriesData || recentEntriesData.length === 0) ? (
                  <p className="text-xs text-muted-foreground">
                    No draws entered yet.
                  </p>
                ) : (
                  <div className="space-y-1 text-xs">
                    {recentEntriesData.map((e) => {
                      const dInfo = e.draws as unknown as {
                        month: string;
                        drawn_numbers: number[] | null;
                        status: string;
                      } | null;
                      return (
                        <div
                          key={e.draw_id}
                          className="flex justify-between items-center py-1 border-b border-border/50 last:border-0"
                        >
                          <span className="font-medium text-foreground">
                            {dInfo?.month || "Draw"}
                          </span>
                          <span className="text-muted-foreground">
                            Numbers: {dInfo?.drawn_numbers?.join(", ") || "Pending"}
                          </span>
                          <span className="font-semibold text-primary">
                            {e.match_count} matches
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/scores">View Scores</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Module (e): Prize Winnings Summary */}
          <Card className="border-border md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Prize Winnings</CardTitle>
                  <CardDescription>
                    Overview of your monthly prize draw winnings
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/winnings">View Details</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-md bg-muted/40">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Total Won
                </p>
                <p className="text-xl font-bold text-foreground">
                  Rs {Math.floor(totalWonMinor / 100)}
                </p>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Pending Payout
                </p>
                <p className="text-xl font-bold text-amber-600">
                  Rs {Math.floor(pendingWonMinor / 100)}
                </p>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Paid Out
                </p>
                <p className="text-xl font-bold text-success">
                  Rs {Math.floor(paidWonMinor / 100)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
