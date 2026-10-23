"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const charitySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const eventSchema = z.object({
  charityId: z.string().uuid("Invalid charity ID"),
  title: z.string().trim().min(2, "Title must be at least 2 characters"),
  description: z.string().trim().optional(),
  eventDate: z.string().min(1, "Date is required"),
  location: z.string().trim().optional(),
});

export async function createCharityAction(formData: FormData) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const name = formData.get("name") as string;
  let slug = (formData.get("slug") as string)?.trim().toLowerCase();
  if (!slug) {
    slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  let imageUrl = (formData.get("imageUrl") as string) || "";
  const file = formData.get("imageFile") as File | null;

  // Handle image file upload if provided
  if (file && file.size > 0) {
    if (file.size > MAX_IMAGE_SIZE) throw new Error("Image exceeds 2 MB limit");
    if (!ALLOWED_MIME_TYPES.includes(file.type)) throw new Error("Only JPG, PNG, and WebP images allowed");

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const tempPath = `charities/${slug}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from("charity-media")
      .upload(tempPath, buffer, { contentType: file.type, upsert: true });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: pubData } = adminClient.storage.from("charity-media").getPublicUrl(tempPath);
    imageUrl = pubData.publicUrl;
  }

  const validated = charitySchema.parse({
    name,
    slug,
    description: (formData.get("description") as string) || "",
    category: (formData.get("category") as string) || "",
    imageUrl,
    isFeatured: formData.get("isFeatured") === "true",
    isActive: formData.get("isActive") === "true",
  });

  const { data: newCharity, error } = await adminClient
    .from("charities")
    .insert({
      name: validated.name,
      slug: validated.slug,
      description: validated.description,
      category: validated.category,
      image_url: validated.imageUrl,
      is_featured: validated.isFeatured,
      is_active: validated.isActive,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("A charity with this slug already exists.");
    throw new Error(error.message);
  }

  revalidatePath("/admin/charities");
  revalidatePath("/charities");
  redirect(`/admin/charities/${newCharity.id}`);
}

export async function updateCharityAction(formData: FormData) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const slug = (formData.get("slug") as string)?.trim().toLowerCase();

  let imageUrl = (formData.get("imageUrl") as string) || "";
  const file = formData.get("imageFile") as File | null;

  if (file && file.size > 0) {
    if (file.size > MAX_IMAGE_SIZE) throw new Error("Image exceeds 2 MB limit");
    if (!ALLOWED_MIME_TYPES.includes(file.type)) throw new Error("Only JPG, PNG, and WebP images allowed");

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${id}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from("charity-media")
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: pubData } = adminClient.storage.from("charity-media").getPublicUrl(path);
    imageUrl = pubData.publicUrl;
  }

  const validated = charitySchema.parse({
    name,
    slug,
    description: (formData.get("description") as string) || "",
    category: (formData.get("category") as string) || "",
    imageUrl,
    isFeatured: formData.get("isFeatured") === "true",
    isActive: formData.get("isActive") === "true",
  });

  const { error } = await adminClient
    .from("charities")
    .update({
      name: validated.name,
      slug: validated.slug,
      description: validated.description,
      category: validated.category,
      image_url: validated.imageUrl,
      is_featured: validated.isFeatured,
      is_active: validated.isActive,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") throw new Error("A charity with this slug already exists.");
    throw new Error(error.message);
  }

  revalidatePath("/admin/charities");
  revalidatePath(`/admin/charities/${id}`);
  revalidatePath("/charities");
}

export async function deleteCharityAction(formData: FormData) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const id = formData.get("id") as string;
  if (!id) throw new Error("Missing charity ID");

  const { error } = await adminClient.from("charities").delete().eq("id", id);

  if (error) {
    // Foreign key constraint violation error 23503
    if (error.code === "23503" || error.message.includes("violates foreign key")) {
      return { success: false, error: "In use. Deactivate it instead." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/charities");
  revalidatePath("/charities");
  return { success: true, error: null };
}

export async function addGalleryImageAction(formData: FormData) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const charityId = formData.get("charityId") as string;
  const file = formData.get("galleryFile") as File | null;

  if (!charityId || !file || file.size === 0) {
    throw new Error("No file selected");
  }

  if (file.size > MAX_IMAGE_SIZE) throw new Error("Image exceeds 2 MB limit");
  if (!ALLOWED_MIME_TYPES.includes(file.type)) throw new Error("Only JPG, PNG, and WebP allowed");

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${charityId}/gallery-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await adminClient.storage
    .from("charity-media")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data: pubData } = adminClient.storage.from("charity-media").getPublicUrl(path);

  // Append to gallery array
  const { data: charity } = await adminClient
    .from("charities")
    .select("gallery")
    .eq("id", charityId)
    .single();

  const gallery = (charity?.gallery || []) as string[];
  gallery.push(pubData.publicUrl);

  await adminClient.from("charities").update({ gallery }).eq("id", charityId);

  revalidatePath(`/admin/charities/${charityId}`);
}

export async function removeGalleryImageAction(formData: FormData) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const charityId = formData.get("charityId") as string;
  const imageUrl = formData.get("imageUrl") as string;

  const { data: charity } = await adminClient
    .from("charities")
    .select("gallery")
    .eq("id", charityId)
    .single();

  const gallery = ((charity?.gallery || []) as string[]).filter((url) => url !== imageUrl);

  await adminClient.from("charities").update({ gallery }).eq("id", charityId);

  revalidatePath(`/admin/charities/${charityId}`);
}

export async function addEventAction(formData: FormData) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const validated = eventSchema.parse({
    charityId: formData.get("charityId"),
    title: formData.get("title"),
    description: (formData.get("description") as string) || "",
    eventDate: formData.get("eventDate"),
    location: (formData.get("location") as string) || "",
  });

  const { error } = await adminClient.from("charity_events").insert({
    charity_id: validated.charityId,
    title: validated.title,
    description: validated.description,
    event_date: new Date(validated.eventDate).toISOString(),
    location: validated.location,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/charities/${validated.charityId}`);
}

export async function deleteEventAction(formData: FormData) {
  await requireAdmin();
  const adminClient = createAdminClient();

  const eventId = formData.get("eventId") as string;
  const charityId = formData.get("charityId") as string;

  const { error } = await adminClient
    .from("charity_events")
    .delete()
    .eq("id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/charities/${charityId}`);
}
