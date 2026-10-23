"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { simulateDraw, publishDraw } from "@/lib/draw-server";

const simulationSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month format (expected YYYY-MM)"),
  mode: z.enum(["random", "algorithmic"]),
});

export async function runSimulationAction(formData: FormData) {
  try {
    await requireAdmin();

    const rawMonth = formData.get("month") as string;
    const rawMode = formData.get("mode") as string;

    const validated = simulationSchema.parse({
      month: rawMonth,
      mode: rawMode,
    });

    const monthFirstDay = `${validated.month}-01`;
    await simulateDraw(monthFirstDay, validated.mode);

    revalidatePath("/admin/draws");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to run simulation";
    throw new Error(message);
  }
}

export async function publishDrawAction(formData: FormData) {
  try {
    await requireAdmin();

    const drawId = formData.get("drawId") as string;
    if (!drawId) {
      throw new Error("Missing draw ID");
    }

    await publishDraw(drawId);
    revalidatePath("/admin/draws");
    revalidatePath("/admin/winners");
    revalidatePath("/dashboard/winnings");
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to publish draw";
    return { success: false, error: message };
  }
}
