import dotenv from "dotenv";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey) {
  console.error("Missing STRIPE_SECRET_KEY in environment");
  process.exit(1);
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  typescript: true,
});

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Idempotently sets up Stripe products and prices matching rows in the `plans` table.
 */
async function main() {
  console.log("Setting up Stripe products and recurring prices...");

  // 1. Fetch plans from database
  const { data: plans, error: plansError } = await supabase
    .from("plans")
    .select("id, key, name, interval, price_minor, currency, stripe_price_id")
    .eq("is_active", true);

  if (plansError || !plans) {
    throw new Error(`Failed to fetch plans: ${plansError?.message}`);
  }

  // 2. Find or create the "Digital Heroes" product
  const products = await stripe.products.list({ limit: 100 });
  let product = products.data.find(
    (p) => p.name === "Digital Heroes" && p.active
  );

  if (!product) {
    console.log("Creating 'Digital Heroes' Stripe product...");
    product = await stripe.products.create({
      name: "Digital Heroes",
      description: "Digital Heroes subscription with prize draw and charity donation",
    });
  } else {
    console.log(`Found existing Stripe product: ${product.id}`);
  }

  // 3. Setup recurring prices for each plan
  for (const plan of plans) {
    const lookupKey = `dh_${plan.key}`;

    const existingPrices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
    });

    let price = existingPrices.data[0];

    if (!price) {
      console.log(
        `Creating price for ${plan.name} (${plan.price_minor} paise / ${plan.interval})...`
      );
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.price_minor,
        currency: (plan.currency || "INR").toLowerCase(),
        recurring: {
          interval: plan.interval as "month" | "year",
        },
        lookup_key: lookupKey,
      });
    } else {
      console.log(`Found existing price for ${lookupKey}: ${price.id}`);
    }

    // Update plans table with stripe_price_id
    if (plan.stripe_price_id !== price.id) {
      const { error: updateError } = await supabase
        .from("plans")
        .update({ stripe_price_id: price.id })
        .eq("id", plan.id);

      if (updateError) {
        throw new Error(
          `Failed to update plan ${plan.key} with price id: ${updateError.message}`
        );
      }
      console.log(`Updated plan '${plan.key}' with stripe_price_id: ${price.id}`);
    } else {
      console.log(`Plan '${plan.key}' already has correct stripe_price_id.`);
    }
  }

  console.log("Stripe setup completed successfully.");
}

main().catch((err) => {
  console.error("Stripe setup failed:", err);
  process.exit(1);
});
