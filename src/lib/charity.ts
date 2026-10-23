/**
 * Pure business logic for charity percentage limits and fee distributions.
 */

export interface PlanPricing {
  interval: string;
  price_minor: number;
}

export interface PlatformSettingsConfig {
  min_charity_percent: number;
  prize_pool_percent: number;
}

/**
 * Computes monthly-equivalent subscription fee in minor units (paise).
 * Per SPEC A2: yearly plans divide by 12, floored to integer paise.
 */
export function monthlyEquivalentMinor(plan: PlanPricing): number {
  if (plan.interval === "year" || plan.interval === "yearly") {
    return Math.floor(plan.price_minor / 12);
  }
  return plan.price_minor;
}

/**
 * Returns allowed charity percentage bounds per SPEC A16:
 * min_charity_percent .. (100 - prize_pool_percent) from platform_settings.
 */
export function getCharityPercentRange(settings: PlatformSettingsConfig) {
  const min = Math.max(0, settings.min_charity_percent);
  const max = Math.min(100, 100 - settings.prize_pool_percent);
  return {
    min: Math.min(min, max),
    max: Math.max(min, max),
  };
}

/**
 * Validates and clamps charity percent to the platform-configured range.
 */
export function validateAndClampCharityPercent(
  percent: number,
  settings: PlatformSettingsConfig
): number {
  const { min, max } = getCharityPercentRange(settings);
  const rounded = Math.round(percent);
  return Math.max(min, Math.min(max, rounded));
}

/**
 * Calculates user's monthly charity contribution in minor paise.
 */
export function calculateCharityContributionMinor(
  monthlyFeeMinor: number,
  charityPercent: number
): number {
  return Math.floor((monthlyFeeMinor * charityPercent) / 100);
}
