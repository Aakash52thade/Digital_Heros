import { z } from "zod";

/**
 * Returns the current date in Asia/Kolkata timezone formatted as YYYY-MM-DD.
 */
export function getTodayIST(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Zod validation schema for golf scores per SPEC A8 & A13:
 * - Integer between 1 and 45 (Stableford)
 * - Valid YYYY-MM-DD date string
 * - Cannot be in the future (Asia/Kolkata timezone)
 */
export const scoreInputSchema = z.object({
  score: z.coerce
    .number({ invalid_type_error: "Score must be a number" })
    .int("Score must be a whole integer")
    .min(1, "Score must be at least 1")
    .max(45, "Score cannot exceed 45"),
  playedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date in YYYY-MM-DD format")
    .refine((val) => {
      const today = getTodayIST();
      return val <= today;
    }, "Score date cannot be in the future"),
});

export const editScoreInputSchema = scoreInputSchema.extend({
  id: z.string().uuid("Invalid score ID"),
});

export type ScoreInput = z.infer<typeof scoreInputSchema>;
export type EditScoreInput = z.infer<typeof editScoreInputSchema>;
