import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  // In development/test environments this may not be set initially
  // Real operations will fail cleanly if accessed without key
}

/**
 * Server-only Stripe client initialized with SDK default API version.
 */
export const stripe = new Stripe(stripeSecretKey || "", {
  typescript: true,
});
