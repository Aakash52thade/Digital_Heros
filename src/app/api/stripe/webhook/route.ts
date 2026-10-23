import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { splitPayment } from "@/lib/billing";
import { syncSubscriptionFromStripe } from "@/lib/subscription";

export const runtime = "nodejs";

/**
 * Handles incoming Stripe webhook events with raw body signature verification and idempotency.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing stripe-signature or STRIPE_WEBHOOK_SECRET" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          await syncSubscriptionFromStripe(subId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripe(sub.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = extractSubscriptionId(invoice);
        if (subId) {
          await syncSubscriptionFromStripe(subId);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = extractSubscriptionId(invoice);

        if (subId) {
          // Idempotency: check if invoice already recorded in payments
          const { data: existingPayment } = await adminClient
            .from("payments")
            .select("id")
            .eq("stripe_invoice_id", invoice.id)
            .maybeSingle();

          if (!existingPayment) {
            // 1. Identify user and profile charity settings
            const customerId =
              typeof invoice.customer === "string"
                ? invoice.customer
                : invoice.customer?.id;

            let profile: {
              id: string;
              charity_id: string | null;
              charity_percent: number;
            } | null = null;

            if (customerId) {
              const { data: p } = await adminClient
                .from("profiles")
                .select("id, charity_id, charity_percent")
                .eq("stripe_customer_id", customerId)
                .maybeSingle();
              profile = p;
            }

            // Fallback: look up by subscription user_id if customer not indexed yet
            if (!profile) {
              const { data: subRow } = await adminClient
                .from("subscriptions")
                .select("user_id")
                .eq("stripe_subscription_id", subId)
                .maybeSingle();

              if (subRow) {
                const { data: p } = await adminClient
                  .from("profiles")
                  .select("id, charity_id, charity_percent")
                  .eq("id", subRow.user_id)
                  .single();
                profile = p;
              }
            }

            if (profile) {
              // 2. Fetch platform prize pool setting (single row id = 1)
              const { data: settings } = await adminClient
                .from("platform_settings")
                .select("prize_pool_percent")
                .eq("id", 1)
                .single();

              const poolPercent = settings?.prize_pool_percent ?? 50;
              const charityPercent = profile.charity_percent ?? 10;
              const amountMinor = invoice.amount_paid;

              // 3. Compute pure integer shares
              const splits = splitPayment(
                amountMinor,
                charityPercent,
                poolPercent
              );

              // 4. Resolve DB subscription_id relation
              const { data: subRecord } = await adminClient
                .from("subscriptions")
                .select("id")
                .eq("stripe_subscription_id", subId)
                .maybeSingle();

              const paidAtTimestamp = invoice.status_transitions?.paid_at
                ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
                : new Date().toISOString();

              // 5. Insert immutable payment record
              const { error: paymentError } = await adminClient
                .from("payments")
                .insert({
                  user_id: profile.id,
                  subscription_id: subRecord?.id || null,
                  stripe_invoice_id: invoice.id,
                  amount_minor: amountMinor,
                  charity_id: profile.charity_id || null,
                  charity_percent: charityPercent,
                  charity_amount_minor: splits.charityAmountMinor,
                  prize_pool_amount_minor: splits.prizePoolAmountMinor,
                  paid_at: paidAtTimestamp,
                });

              if (paymentError) {
                throw paymentError;
              }
            }
          }

          // Always ensure subscription reflects latest period after payment
          await syncSubscriptionFromStripe(subId);
        }
        break;
      }

      default:
        // Acknowledge unhandled event
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Processing error";
    console.error("Stripe webhook processing error:", errorMsg);
    // Return 500 so Stripe retries delivery on transient failures
    return NextResponse.json(
      { error: `Webhook processing error: ${errorMsg}` },
      { status: 500 }
    );
  }
}

/**
 * Extracts subscription ID across varying Stripe Invoice schema representations.
 */
function extractSubscriptionId(invoice: Stripe.Invoice): string | null {
  const invAny = invoice as unknown as {
    subscription?: string | { id: string } | null;
    parent?: { subscription_details?: { subscription?: string } };
  };

  if (typeof invAny.subscription === "string") {
    return invAny.subscription;
  }
  if (invAny.subscription && typeof invAny.subscription.id === "string") {
    return invAny.subscription.id;
  }
  if (invAny.parent?.subscription_details?.subscription) {
    return invAny.parent.subscription_details.subscription;
  }
  return null;
}
