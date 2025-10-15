"use server";
import "server-only";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const updateAvatarSchema = z.object({ userId: z.string().min(1) });

async function uploadToCloudinary(file: File) {
  // Expect CLOUDINARY_URL in env (or CLOUDINARY_API)
  const cloudinaryUrl = process.env.CLOUDINARY_API_URL || process.env.CLOUDINARY_URL;
  if (!cloudinaryUrl) throw new Error("Cloudinary not configured");

  const form = new FormData();
  // In Node/Edge runtimes, File implements Blob-like interface. Append directly.
  form.append("file", file as unknown as Blob);
  // If using unsigned upload, client should provide upload_preset; for server-side we assume API key present in CLOUDINARY_URL

  const res = await fetch(cloudinaryUrl, { method: "POST", body: form });
  if (!res.ok) throw new Error("Failed to upload image");
  const json = await res.json();
  return json.secure_url ?? json.url;
}

export const updateAvatar = async (_prev: { error?: string }, formData: FormData) => {
  const raw = { userId: formData.get("userId") };
  const parsed = updateAvatarSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const file = formData.get("avatar") as File | null;
  if (!file) return { error: "No file uploaded" };

  try {
    const url = await uploadToCloudinary(file);

    await db.update(user).set({ image: url }).where(eq(user.id, parsed.data.userId));

    revalidatePath('/', 'layout');

    return { success: true };
  } catch (err) {
    return { error: (err as Error).message ?? "Failed to upload avatar" };
  }
};
