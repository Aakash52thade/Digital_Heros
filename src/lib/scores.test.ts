import { describe, it, expect } from "vitest";
import { getTodayIST, scoreInputSchema, editScoreInputSchema } from "./scores";

describe("scores validation", () => {
  const today = getTodayIST();

  it("accepts valid score within 1-45 and current date", () => {
    const result = scoreInputSchema.safeParse({
      score: 36,
      playedOn: today,
    });
    expect(result.success).toBe(true);
  });

  it("rejects score below 1", () => {
    const result = scoreInputSchema.safeParse({
      score: 0,
      playedOn: today,
    });
    expect(result.success).toBe(false);
  });

  it("rejects score above 45", () => {
    const result = scoreInputSchema.safeParse({
      score: 46,
      playedOn: today,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer score", () => {
    const result = scoreInputSchema.safeParse({
      score: 36.5,
      playedOn: today,
    });
    expect(result.success).toBe(false);
  });

  it("rejects future date", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const tomorrowStr = getTodayIST(tomorrow);

    const result = scoreInputSchema.safeParse({
      score: 36,
      playedOn: tomorrowStr,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "Score date cannot be in the future"
      );
    }
  });

  it("validates edit score input with valid uuid", () => {
    const result = editScoreInputSchema.safeParse({
      id: "b4b1cfb6-3974-4b52-9da5-055a401c4021",
      score: 40,
      playedOn: today,
    });
    expect(result.success).toBe(true);
  });

  it("rejects edit score input with invalid uuid", () => {
    const result = editScoreInputSchema.safeParse({
      id: "invalid-id",
      score: 40,
      playedOn: today,
    });
    expect(result.success).toBe(false);
  });
});
