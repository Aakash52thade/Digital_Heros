import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTodayIST } from "@/lib/scores";
import { getCharityPercentRange } from "@/lib/charity";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  EditProfileForm,
  AdminScoreManager,
  SubscriptionControls,
} from "./client";

export const metadata = {
  title: "User Profile - Digital Heroes Admin",
};

interface UserDetailPageProps {
  params: {
    id: string;
  };
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const userId = params.id;

  // 1. Fetch user auth data
  const { data: authData, error: authError } =
    await adminClient.auth.admin.getUserById(userId);

  if (authError || !authData?.user) {
    notFound();
  }

  const user = authData.user;

  // 2. Fetch profile data
  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, role, charity_id, charity_percent, stripe_customer_id")
    .eq("id", userId)
    .single();

  // 3. Fetch latest subscription
  const { data: sub } = await adminClient
    .from("subscriptions")
    .select("stripe_subscription_id, status, current_period_end, cancel_at_period_end, plans(name, interval)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. Fetch scores (latest 5)
  const { data: scoresData } = await adminClient
    .from("scores")
    .select("id, score, played_on")
    .eq("user_id", userId)
    .order("played_on", { ascending: false })
    .limit(5);

  const scores = scoresData || [];

  // 5. Active charities & settings
  const { data: charitiesData } = await adminClient
    .from("charities")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const { data: settings } = await adminClient
    .from("platform_settings")
    .select("min_charity_percent, prize_pool_percent")
    .eq("id", 1)
    .single();

  const { min: minPercent, max: maxPercent } = getCharityPercentRange({
    min_charity_percent: settings?.min_charity_percent ?? 10,
    prize_pool_percent: settings?.prize_pool_percent ?? 50,
  });

  const todayIST = getTodayIST();
  const planInfo = sub?.plans as unknown as { name: string; interval: string } | null;

  return (
    <main className="p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground">
              {profile?.full_name || "User Details"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {user.email} &bull; Role: <span className="font-semibold capitalize">{profile?.role}</span>
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/users">&larr; Back to Users</Link>
          </Button>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Edit Profile per A21 */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl">Profile & Charity</CardTitle>
              <CardDescription>
                Edit subscriber name, charity selection, and impact percentage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditProfileForm
                userId={userId}
                initialName={profile?.full_name || ""}
                initialCharityId={profile?.charity_id || ""}
                initialPercent={profile?.charity_percent ?? minPercent}
                charities={charitiesData || []}
                minPercent={minPercent}
                maxPercent={maxPercent}
              />
            </CardContent>
          </Card>

          {/* Subscription Panel */}
          <Card className="border-border flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-xl">Subscription Status</CardTitle>
              <CardDescription>
                Stripe lifecycle controls (Cancel at period end, Cancel now, Resume)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground">Plan</p>
                <p className="text-base font-medium">{planInfo?.name || "None"}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground">Status</p>
                <p className="text-base font-medium capitalize">{sub?.status || "Inactive"}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground">Period End</p>
                <p className="text-base font-medium">
                  {sub?.current_period_end
                    ? new Date(sub.current_period_end).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              {sub?.cancel_at_period_end && (
                <p className="text-xs font-semibold text-amber-600">
                  Scheduled to cancel at end of current billing cycle.
                </p>
              )}
            </CardContent>
            <CardContent className="pt-0">
              {sub?.stripe_subscription_id ? (
                <SubscriptionControls
                  userId={userId}
                  stripeSubId={sub.stripe_subscription_id}
                  cancelsAtEnd={Boolean(sub.cancel_at_period_end)}
                  status={sub.status}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  No active Stripe subscription to manage.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Scores Manager */}
          <Card className="border-border md:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl">Manage Scores</CardTitle>
              <CardDescription>
                Stableford scores rolling-5 list. Rules enforce max date today IST and rolling replacement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminScoreManager
                userId={userId}
                scores={scores}
                todayIST={todayIST}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
