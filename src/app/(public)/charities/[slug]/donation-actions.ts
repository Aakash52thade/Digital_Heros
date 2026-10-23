"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

const donationSchema = z.object({
  charityId: z.string().uuid("Invalid charity ID"),
  charitySlug: z.string(),
  amountRupees: z.coerce
    .number()
    .min(100, "Minimum donation is ₹100 (10,000 paise)")
    .max(100000, "Maximum donation is ₹1,00,000 (10,000,000 paise)"),
});

/**
 * Server action to initiate one-off Stripe Checkout donation per SPEC A14.
 */
export async function createDonationCheckoutAction(formData: FormData) {
  const parse = donationSchema.safeParse({
    charityId: formData.get("charityId"),
    charitySlug: formData.get("charitySlug"),
    amountRupees: formData.get("amountRupees"),
  });

  if (!parse.success) {
    throw new Error(parse.error.issues.map((i) => i.message).join(", "));
  }

  const { charityId, charitySlug, amountRupees } = parse.data;
  const amountMinor = Math.round(amountRupees * 100);

  // A14 min 10000 and max 10000000 paise
  if (amountMinor < 10000 || amountMinor > 10000000) {
    throw new Error("Donation must be between ₹100 (10,000 paise) and ₹1,00,000 (10,000,000 paise).");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: charity } = await supabase
    .from("charities")
    .select("id, name")
    .eq("id", charityId)
    .single();

  if (!charity) {
    throw new Error("Charity not found");
  }

  const siteUrl = await getSiteUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "inr",
          unit_amount: amountMinor,
          product_data: {
            name: `Donation to ${charity.name}`,
            description: "Direct one-off charitable contribution (not part of prize pool)",
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "donation",
      charity_id: charity.id,
      user_id: user?.id || "",
    },
    success_url: `${siteUrl}/charities/${charitySlug}?donated=1`,
    cancel_url: `${siteUrl}/charities/${charitySlug}`,
  });

  if (!session.url) {
    throw new Error("Failed to create Stripe Checkout session");
  }

  redirect(session.url);
}

/**
 * Server action for logged-in user to set this charity as their supported membership charity.
 */
export async function setAsMyCharityAction(formData: FormData) {
  const charityId = formData.get("charityId");
  const parse = z.string().uuid().safeParse(charityId);

  if (!parse.success) {
    throw new Error("Invalid charity ID");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ charity_id: parse.data })
    .eq("id", user.id);

  if (error) {
    throw new Error(`Failed to update supported charity: ${error.message}`);
  }

  redirect("/dashboard");
}
