import { describe, it, expect } from "vitest";
import {
  monthlyEquivalentMinor,
  getCharityPercentRange,
  validateAndClampCharityPercent,
  calculateCharityContributionMinor,
} from "./charity";

describe("charity calculations", () => {
  it("computes monthly equivalent for monthly plan", () => {
    expect(monthlyEquivalentMinor({ interval: "month", price_minor: 49900 })).toBe(49900);
  });

  it("computes monthly equivalent for yearly plan (floor of yearly / 12)", () => {
    // 499000 / 12 = 41583.3333 -> 41583
    expect(monthlyEquivalentMinor({ interval: "year", price_minor: 499000 })).toBe(41583);
  });

  it("calculates percentage bounds per A16 (min_charity .. 100 - prize_pool)", () => {
    const range = getCharityPercentRange({
      min_charity_percent: 10,
      prize_pool_percent: 50,
    });
    expect(range.min).toBe(10);
    expect(range.max).toBe(50);
  });

  it("clamps charity percent within range", () => {
    const settings = { min_charity_percent: 10, prize_pool_percent: 50 };
    expect(validateAndClampCharityPercent(5, settings)).toBe(10);
    expect(validateAndClampCharityPercent(25, settings)).toBe(25);
    expect(validateAndClampCharityPercent(65, settings)).toBe(50);
  });

  it("calculates charity contribution in minor units", () => {
    // 49900 * 20% = 9980 paise
    expect(calculateCharityContributionMinor(49900, 20)).toBe(9980);
  });
});
