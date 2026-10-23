"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per A19
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadProofAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("You must be logged in to upload proof");
    }

    const winnerId = formData.get("winnerId") as string;
    const file = formData.get("proof") as File | null;

    if (!winnerId || !file || file.size === 0) {
      throw new Error("Please select a valid image file");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File size exceeds 5 MB limit");
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error("Only JPG, PNG, and WebP images are allowed");
    }

    const adminClient = createAdminClient();

    // Verify winner belongs to this user and is in awaiting_proof or rejected
    const { data: winner, error: winnerError } = await adminClient
      .from("winners")
      .select("id, user_id, verification_status")
      .eq("id", winnerId)
      .single();

    if (winnerError || !winner) {
      throw new Error("Winnings record not found");
    }

    if (winner.user_id !== user.id) {
      throw new Error("Unauthorized to upload proof for this prize");
    }

    if (!["awaiting_proof", "rejected"].includes(winner.verification_status)) {
      throw new Error("Scorecard has already been submitted or approved");
    }

    // Determine extension
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const timestamp = Date.now();
    const storagePath = `${user.id}/${winnerId}-${timestamp}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from("winner-proofs")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload scorecard: ${uploadError.message}`);
    }

    // Update winner status
    const { error: updateError } = await adminClient
      .from("winners")
      .update({
        proof_path: storagePath,
        verification_status: "submitted",
      })
      .eq("id", winnerId);

    if (updateError) {
      throw new Error(`Failed to update verification status: ${updateError.message}`);
    }

    revalidatePath("/dashboard/winnings");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    throw new Error(message);
  }
}
