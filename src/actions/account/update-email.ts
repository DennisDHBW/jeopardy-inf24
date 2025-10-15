"use server";
import "server-only";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { changeEmail } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";

const updateEmailSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
});

export const updateEmail = async (_prev: { error?: string }, formData: FormData) => {
  const raw = { userId: formData.get("userId"), email: formData.get("email") };

  const parsed = updateEmailSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const { userId, email } = parsed.data;

  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (existing.length > 0 && existing[0].id !== userId) {
    return { error: "This email address is already in use." };
  }

  // Delegate to better-auth changeEmail (server-side helper)
  try {
    await changeEmail({ body: { newEmail: email }, asResponse: false });
  } catch (err) {
    return { error: (err as Error).message ?? "Failed to change email" };
  }

  // Also update our user record image/name if needed

  await db
    .update(user)
    .set({ email })
    .where(eq(user.id, userId));

  revalidatePath("/", "layout");

  return { success: true };
};
