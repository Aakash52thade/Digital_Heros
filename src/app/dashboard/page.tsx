import Link from "next/link";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/auth/actions";
import { openBillingPortal } from "@/app/subscribe/actions";
import { getSubscriptionState, syncSubscriptionFromStripe } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

  // Immediate checkout return sync: don't wait for webhook delivery
  if (searchParams?.checkout === "success" && searchParams.session_id && userId) {
    let currentState = await getSubscriptionState(userId);
    if (!currentState.active) {
      try {
        const session = await stripe.checkout.sessions.retrieve(
          searchParams.session_id
        );
        if (
          session.client_reference_id === userId &&
          session.subscription
        ) {
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

  // Fetch updated subscription state and profile
  let subState = await getSubscriptionState(userId);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .maybeSingle();

  const name =
    profile?.full_name || user?.user_metadata?.full_name || "Valued Hero";
  const email = user?.email || "";

  // Determine status label and badge color
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
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard/scores">Golf Scores</Link>
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

          {/* Account Overview Card */}
          <Card className="border-border flex flex-col justify-between">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Profile Information</CardTitle>
              <CardDescription>Account contact and role details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
            <CardFooter className="pt-2">
              <p className="text-xs text-muted-foreground">
                Charity selection and score management unlocked with active
                membership.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}
