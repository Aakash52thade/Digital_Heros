import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionState } from "@/lib/subscription";
import { createCheckoutOrPortalSession } from "./actions";
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
  title: "Subscribe - Digital Heroes",
  description: "Choose a Digital Heroes subscription plan",
};

export default async function SubscribePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const subState = user ? await getSubscriptionState(user.id) : null;

  // Fetch active plans from database
  const { data: plans } = await supabase
    .from("plans")
    .select("key, name, interval, price_minor, currency")
    .eq("is_active", true)
    .order("price_minor", { ascending: true });

  const monthlyPlan = plans?.find((p) => p.key === "monthly");
  const yearlyPlan = plans?.find((p) => p.key === "yearly");

  return (
    <main className="min-h-screen bg-background py-16 px-6 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight font-heading text-foreground sm:text-5xl">
            Choose Your Membership
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Every subscription enters you into the monthly prize draw and directly
            funds life-changing charities.
          </p>
          {subState?.active && (
            <div className="inline-block rounded-md bg-success/10 border border-success/20 px-4 py-2 text-sm font-medium text-success">
              You currently have an active membership. Submitting will open your
              billing management portal.
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          {/* Monthly Plan */}
          <Card className="flex flex-col justify-between border-border relative hover:-translate-y-1 hover:shadow-md transition-all">
            <CardHeader>
              <CardTitle className="text-2xl">{monthlyPlan?.name || "Monthly Hero"}</CardTitle>
              <CardDescription>
                Flexible month-to-month membership with recurring draw entry
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold font-heading text-foreground">
                  ₹{monthlyPlan ? Math.floor(monthlyPlan.price_minor / 100) : 499}
                </span>
                <span className="text-muted-foreground">/ month</span>
              </div>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>✓ Monthly prize draw entry (5 numbers)</li>
                <li>✓ Minimum 10% direct charity donation</li>
                <li>✓ Full score tracking & handicap validation</li>
                <li>✓ Cancel anytime with ease</li>
              </ul>
            </CardContent>
            <CardFooter>
              <form action={createCheckoutOrPortalSession} className="w-full">
                <input type="hidden" name="planKey" value="monthly" />
                <Button type="submit" variant="accent" className="w-full">
                  {subState?.active ? "Manage Membership" : "Subscribe Monthly"}
                </Button>
              </form>
            </CardFooter>
          </Card>

          {/* Yearly Plan */}
          <Card className="flex flex-col justify-between border-primary/40 relative shadow-md hover:-translate-y-1 hover:shadow-lg transition-all">
            <div className="absolute -top-3 right-4 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
              Best Value
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">{yearlyPlan?.name || "Yearly Hero"}</CardTitle>
              <CardDescription>
                Full year of monthly draws and sustained charitable impact
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold font-heading text-foreground">
                  ₹{yearlyPlan ? Math.floor(yearlyPlan.price_minor / 100) : 4990}
                </span>
                <span className="text-muted-foreground">/ year</span>
              </div>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>✓ 12 consecutive monthly prize draws</li>
                <li>✓ Greater cumulative charity impact</li>
                <li>✓ Equivalent to 2 months free</li>
                <li>✓ Priority support & winner verification</li>
              </ul>
            </CardContent>
            <CardFooter>
              <form action={createCheckoutOrPortalSession} className="w-full">
                <input type="hidden" name="planKey" value="yearly" />
                <Button type="submit" variant="accent" className="w-full">
                  {subState?.active ? "Manage Membership" : "Subscribe Yearly"}
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>

        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-sm text-primary hover:underline font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
