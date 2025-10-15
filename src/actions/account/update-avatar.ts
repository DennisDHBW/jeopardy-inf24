"use server";
import "server-only";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";

const updateAvatarSchema = z.object({ userId: z.string().min(1) });

async function uploadToCloudinary(file: File) {
  // Expect CLOUDINARY_URL in env (or CLOUDINARY_API)
  const cloudinaryUrl = process.env.CLOUDINARY_API_URL || process.env.CLOUDINARY_URL;
  if (cloudinaryUrl) {
    const form = new FormData();
    // In Node/Edge runtimes, File implements Blob-like interface. Append directly.
    form.append("file", file as unknown as Blob);
    // If using unsigned upload, client should provide upload_preset; for server-side we assume API key present in CLOUDINARY_URL

    const res = await fetch(cloudinaryUrl, { method: "POST", body: form });
    if (!res.ok) throw new Error("Failed to upload image");
    const json = await res.json();
    return json.secure_url ?? json.url;
  }

  // Fallback: save file locally under public/uploads so dev works without Cloudinary
  // Convert File/Blob to buffer
  const arrayBuffer = await (file as any).arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  // Try to preserve extension if available
  const originalName = (file as any).name ?? "avatar";
  const ext = path.extname(originalName) || ".png";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.writeFile(filePath, buffer);

  // Return the public URL path
  return `/uploads/${fileName}`;
}

export const updateAvatar = async (_prev: { error?: string }, formData: FormData) => {
  const userIdRaw = formData.get("userId");
  const raw = { userId: typeof userIdRaw === "string" ? userIdRaw : (userIdRaw ? String(userIdRaw) : "") };
  const parsed = updateAvatarSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const file = formData.get("avatar") as File | null;
  if (!file) return { error: "No file uploaded" };

  if (process.env.DEBUG_UPDATE_AVATAR) {
    try {
      // eslint-disable-next-line no-console
      console.debug("updateAvatar - incoming", { userId: parsed.data.userId, fileName: (file as any).name ?? "<unknown>" });
    } catch (_) {}
  }

  try {
    const url = await uploadToCloudinary(file);

    await db.update(user).set({ image: url }).where(eq(user.id, parsed.data.userId));

    revalidatePath('/', 'layout');

    return { success: true };
  } catch (err) {
    try {
      // eslint-disable-next-line no-console
      console.error("updateAvatar - error:", err);
    } catch (_) {}
    return { error: (err as Error).message ?? "Failed to upload avatar" };
  }
};
