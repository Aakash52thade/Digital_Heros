"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function approveWinnerAction(formData: FormData) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const winnerId = formData.get("winnerId") as string;
  if (!winnerId) throw new Error("Missing winner ID");

  const { error } = await adminClient
    .from("winners")
    .update({
      verification_status: "approved",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", winnerId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/winners");
  revalidatePath("/dashboard/winnings");
}

export async function rejectWinnerAction(formData: FormData) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const winnerId = formData.get("winnerId") as string;
  const adminNote = (formData.get("adminNote") as string) || "Score card rejected. Please re-upload.";
  if (!winnerId) throw new Error("Missing winner ID");

  const { error } = await adminClient
    .from("winners")
    .update({
      verification_status: "rejected",
      admin_note: adminNote,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", winnerId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/winners");
  revalidatePath("/dashboard/winnings");
}

export async function markPaidAction(formData: FormData) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const winnerId = formData.get("winnerId") as string;
  if (!winnerId) throw new Error("Missing winner ID");

  // Enforce rule A19: payment_status can become 'paid' only when verification_status = 'approved'
  const { data: winner } = await adminClient
    .from("winners")
    .select("verification_status")
    .eq("id", winnerId)
    .single();

  if (winner?.verification_status !== "approved") {
    throw new Error("Cannot mark paid until verification is approved");
  }

  const { error } = await adminClient
    .from("winners")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", winnerId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/winners");
  revalidatePath("/dashboard/winnings");
}

export async function viewProofUrlAction(formData: FormData) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const proofPath = formData.get("proofPath") as string;
  if (!proofPath) throw new Error("No proof path provided");

  const { data, error } = await adminClient.storage
    .from("winner-proofs")
    .createSignedUrl(proofPath, 60);

  if (error || !data?.signedUrl) {
    throw new Error("Failed to generate proof signed URL");
  }

  redirect(data.signedUrl);
}
