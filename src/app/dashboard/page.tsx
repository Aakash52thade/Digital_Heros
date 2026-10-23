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

  // Fetch subscription, profile, active charities, platform settings & plan
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
  let monthlyFeeMinor = 49900; // default benchmark
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

  const name =
    profile?.full_name || user?.user_metadata?.full_name || "Valued Hero";
  const email = user?.email || "";

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
      <div className="max-w-4xl mx-auto space-y-8">
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
              <Link href="/charities">Explore Charities</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/scores">Golf Scores</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/winnings">My Winnings</Link>
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

        <div className="grid md:grid-cols-2 gap-6">
          {/* Subscription Status Card */}
          <Card className="border-border flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Membership Status</CardTitle>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadgeClass}`}
                >
                  {statusLabel}
                </span>
              </div>
              <CardDescription>
                Your prize draw entry and charity contribution
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
                <Button asChild variant="accent" className="w-full">
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

          {/* Charity Card: Task 6 */}
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

          {/* Account Overview Card */}
          <Card className="border-border md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Profile Information</CardTitle>
              <CardDescription>Account contact and role details</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Name
                </p>
                <p className="text-base font-medium text-foreground">{name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Email
                </p>
                <p className="text-base font-medium text-foreground">{email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Role
                </p>
                <p className="text-sm font-medium text-primary capitalize">
                  {profile?.role || "subscriber"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
