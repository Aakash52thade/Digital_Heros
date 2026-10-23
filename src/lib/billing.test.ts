import { describe, it, expect } from "vitest";
import {
  mapStripeStatus,
  isSubscriptionActive,
  splitPayment,
} from "./billing";

describe("mapStripeStatus", () => {
  it("maps active and trialing to active", () => {
    expect(mapStripeStatus("active")).toBe("active");
    expect(mapStripeStatus("trialing")).toBe("active");
  });

  it("maps past_due and unpaid to past_due", () => {
    expect(mapStripeStatus("past_due")).toBe("past_due");
    expect(mapStripeStatus("unpaid")).toBe("past_due");
  });

  it("maps canceled to canceled", () => {
    expect(mapStripeStatus("canceled")).toBe("canceled");
  });

  it("maps others to incomplete", () => {
    expect(mapStripeStatus("incomplete")).toBe("incomplete");
    expect(mapStripeStatus("incomplete_expired")).toBe("incomplete");
    expect(mapStripeStatus("unknown_status")).toBe("incomplete");
  });
});

describe("isSubscriptionActive", () => {
  const baseTime = new Date("2026-10-21T12:00:00Z");

  it("returns true for active subscription with future end date", () => {
    const futureDate = new Date("2026-10-22T12:00:00Z");
    expect(
      isSubscriptionActive(
        { status: "active", current_period_end: futureDate },
        baseTime
      )
    ).toBe(true);
  });

  it("returns false if current_period_end is in the past", () => {
    const pastDate = new Date("2026-10-20T12:00:00Z");
    expect(
      isSubscriptionActive(
        { status: "active", current_period_end: pastDate },
        baseTime
      )
    ).toBe(false);
  });

  it("returns false if status is not active (even if period end is in the future)", () => {
    const futureDate = new Date("2026-10-22T12:00:00Z");
    expect(
      isSubscriptionActive(
        { status: "past_due", current_period_end: futureDate },
        baseTime
      )
    ).toBe(false);
    expect(
      isSubscriptionActive(
        { status: "canceled", current_period_end: futureDate },
        baseTime
      )
    ).toBe(false);
  });

  it("handles string date inputs", () => {
    expect(
      isSubscriptionActive(
        {
          status: "active",
          current_period_end: "2026-10-22T12:00:00.000Z",
        },
        baseTime
      )
    ).toBe(true);
  });

  it("returns false for null subscription", () => {
    expect(isSubscriptionActive(null, baseTime)).toBe(false);
  });
});

describe("splitPayment", () => {
  it("floors each share and leaves integer remainder with platform", () => {
    // 49900 paise, 15% charity, 50% pool
    // 49900 * 0.15 = 7485
    // 49900 * 0.50 = 24950
    // platform = 49900 - 7485 - 24950 = 17465
    const split = splitPayment(49900, 15, 50);
    expect(split.charityAmountMinor).toBe(7485);
    expect(split.prizePoolAmountMinor).toBe(24950);
    expect(split.platformAmountMinor).toBe(17465);
    expect(
      split.charityAmountMinor +
        split.prizePoolAmountMinor +
        split.platformAmountMinor
    ).toBe(49900);
  });

  it("floors fractional paise properly", () => {
    // 499 paise, 10% charity = 49.9 -> 49
    // 50% pool = 249.5 -> 249
    // platform = 499 - 49 - 249 = 201
    const split = splitPayment(499, 10, 50);
    expect(split.charityAmountMinor).toBe(49);
    expect(split.prizePoolAmountMinor).toBe(249);
    expect(split.platformAmountMinor).toBe(201);
    expect(
      split.charityAmountMinor +
        split.prizePoolAmountMinor +
        split.platformAmountMinor
    ).toBe(499);
  });
});
