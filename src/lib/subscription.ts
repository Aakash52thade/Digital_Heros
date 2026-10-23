import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSubscriptionActive, mapStripeStatus, SubscriptionStatus } from "@/lib/billing";

export interface SubscriptionState {
  active: boolean;
  status: SubscriptionStatus | "inactive";
  planKey: "monthly" | "yearly" | null;
  renewsOn: string | null;
  cancelsAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
}

/**
 * Checks current user subscription status from the database.
 * Per-request check without hitting Stripe API.
 */
export async function getSubscriptionState(
  userId: string
): Promise<SubscriptionState> {
  const supabase = await createClient();

  // Fetch latest subscription record for user
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, cancel_at_period_end, plan_id, plans(key)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Also get stripe_customer_id from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (!sub) {
    return {
      active: false,
      status: "inactive",
      planKey: null,
      renewsOn: null,
      cancelsAtPeriodEnd: false,
      stripeCustomerId: profile?.stripe_customer_id || null,
    };
  }

  const active = isSubscriptionActive({
    status: sub.status,
    current_period_end: sub.current_period_end,
  });

  const planRelation = sub.plans as unknown as { key: "monthly" | "yearly" } | null;
  const planKey = planRelation?.key || null;

  return {
    active,
    status: mapStripeStatus(sub.status),
    planKey,
    renewsOn: sub.current_period_end,
    cancelsAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    stripeCustomerId: profile?.stripe_customer_id || null,
  };
}

/**
 * Server-side route guard: ensures user is authenticated and has an active subscription.
 * Redirects to /subscribe if not active.
 */
export async function requireActiveSubscription() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const state = await getSubscriptionState(user.id);
  if (!state.active) {
    redirect("/subscribe");
  }

  return { user, state };
}

/**
 * Retrieves the latest subscription state directly from Stripe and upserts into `subscriptions`.
 * Always retrieves from Stripe to avoid race conditions with out-of-order webhook events.
 */
export async function syncSubscriptionFromStripe(stripeSubscriptionId: string) {
  const adminClient = createAdminClient();

  // 1. Fetch fresh subscription from Stripe
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

  // 2. Identify the user
  let userId = sub.metadata?.user_id;

  if (!userId) {
    const customerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer.id;

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (profile) {
      userId = profile.id;
    }
  }

  if (!userId) {
    throw new Error(
      `Cannot sync subscription ${stripeSubscriptionId}: user ID not resolved from metadata or customer`
    );
  }

  // 3. Match plan in DB
  const item = sub.items?.data?.[0];
  const stripePriceId = item?.price?.id;

  const { data: plan } = await adminClient
    .from("plans")
    .select("id")
    .eq("stripe_price_id", stripePriceId || "")
    .maybeSingle();

  if (!plan) {
    throw new Error(
      `Cannot find plan matching Stripe price ID: ${stripePriceId}`
    );
  }

  // 4. Resolve timestamps handling root or item fields
  const rawStart = (item as unknown as { current_period_start?: number })
    ?.current_period_start ?? (sub as unknown as { current_period_start?: number }).current_period_start;
  const rawEnd = (item as unknown as { current_period_end?: number })
    ?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;

  const currentPeriodStart = rawStart
    ? new Date(rawStart * 1000).toISOString()
    : null;
  const currentPeriodEnd = rawEnd
    ? new Date(rawEnd * 1000).toISOString()
    : null;

  const status = mapStripeStatus(sub.status);

  // 5. Upsert subscription row
  const { error: upsertError } = await adminClient
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        plan_id: plan.id,
        stripe_subscription_id: sub.id,
        status,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: sub.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" }
    );

  if (upsertError) {
    throw upsertError;
  }

  return { userId, status, currentPeriodEnd };
}
