export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

/**
 * Maps raw Stripe subscription status string to application subscription status.
 */
export function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return "incomplete";
  }
}

/**
 * Determines whether a subscription is currently active per SPEC A11:
 * Status must be 'active' and current_period_end must be in the future.
 * A subscription marked cancel_at_period_end remains active until period end.
 */
export function isSubscriptionActive(
  sub: {
    status: string;
    current_period_end: string | Date | null;
  } | null,
  now: Date = new Date()
): boolean {
  if (!sub || !sub.current_period_end) {
    return false;
  }

  const normalizedStatus = mapStripeStatus(sub.status);
  if (normalizedStatus !== "active") {
    return false;
  }

  const periodEnd =
    typeof sub.current_period_end === "string"
      ? new Date(sub.current_period_end)
      : sub.current_period_end;

  return periodEnd.getTime() > now.getTime();
}

export interface PaymentSplit {
  charityAmountMinor: number;
  prizePoolAmountMinor: number;
  platformAmountMinor: number;
}

/**
 * Splits payment into integer paise shares for charity, prize pool, and platform remainder.
 * Each portion is floored to integer paise.
 */
export function splitPayment(
  amountMinor: number,
  charityPercent: number,
  poolPercent: number
): PaymentSplit {
  const safeAmount = Math.max(0, Math.floor(amountMinor));
  const safeCharityPercent = Math.max(0, Math.min(100, charityPercent));
  const safePoolPercent = Math.max(0, Math.min(100, poolPercent));

  const charityAmountMinor = Math.floor(
    (safeAmount * safeCharityPercent) / 100
  );
  const prizePoolAmountMinor = Math.floor((safeAmount * safePoolPercent) / 100);
  const platformAmountMinor =
    safeAmount - charityAmountMinor - prizePoolAmountMinor;

  return {
    charityAmountMinor,
    prizePoolAmountMinor,
    platformAmountMinor,
  };
}
