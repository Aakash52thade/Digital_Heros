"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSubscriptionState } from "@/lib/subscription";
import { getSiteUrl } from "@/lib/site-url";

const planKeySchema = z.enum(["monthly", "yearly"]);

/**
 * Server action to initiate checkout or redirect active subscribers to the billing portal.
 */
export async function createCheckoutOrPortalSession(formData: FormData) {
  const planKeyRaw = formData.get("planKey");
  const parse = planKeySchema.safeParse(planKeyRaw);

  if (!parse.success) {
    throw new Error("Invalid plan selection");
  }

  const planKey = parse.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const siteUrl = await getSiteUrl();
  const subState = await getSubscriptionState(user.id);

  // If already active, redirect to billing portal
  if (subState.active) {
    let customerId = subState.stripeCustomerId;
    if (!customerId) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub?.stripe_subscription_id) {
        const stripeSub = await stripe.subscriptions.retrieve(
          sub.stripe_subscription_id
        );
        customerId =
          typeof stripeSub.customer === "string"
            ? stripeSub.customer
            : stripeSub.customer.id;
      }
    }

    if (customerId) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${siteUrl}/dashboard`,
      });
      redirect(portalSession.url);
    }
  }

  const adminClient = createAdminClient();

  // 1. Get or create Stripe customer
  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.full_name || undefined,
      metadata: { user_id: user.id },
    });

    customerId = customer.id;

    // Persist customer ID to profiles; gracefully handle if 0002_phase2.sql hasn't been run yet
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);

    if (updateError) {
      console.warn(
        "Notice: profiles.stripe_customer_id update deferred (apply 0002_phase2.sql to allow service_role updates):",
        updateError.message
      );
    }
  }

  // 2. Fetch selected plan from DB
  const { data: plan, error: planError } = await adminClient
    .from("plans")
    .select("stripe_price_id, name")
    .eq("key", planKey)
    .eq("is_active", true)
    .single();

  if (planError || !plan?.stripe_price_id) {
    throw new Error(
      `Plan '${planKey}' does not have an active Stripe price configured. Please run 'npm run stripe:setup'.`
    );
  }

  // 3. Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [
      {
        price: plan.stripe_price_id,
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        user_id: user.id,
      },
    },
    success_url: `${siteUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/subscribe`,
  });

  if (!session.url) {
    throw new Error("Failed to create Stripe Checkout session");
  }

  redirect(session.url);
}

/**
 * Server action to open Stripe Customer Billing Portal.
 */
export async function openBillingPortal() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub?.stripe_subscription_id) {
      const stripeSub = await stripe.subscriptions.retrieve(
        sub.stripe_subscription_id
      );
      customerId =
        typeof stripeSub.customer === "string"
          ? stripeSub.customer
          : stripeSub.customer.id;
    }
  }

  if (!customerId) {
    redirect("/subscribe");
  }

  const siteUrl = await getSiteUrl();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${siteUrl}/dashboard`,
  });

  redirect(portalSession.url);
}
