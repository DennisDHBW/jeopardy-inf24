"use server";

import "server-only";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const updateNameSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(100),
});

export const updateName = async (_prev: { error?: string }, formData: FormData) => {
  const raw = {
    userId: formData.get("userId"),
    name: formData.get("name"),
  };

  const parsed = updateNameSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const { userId, name } = parsed.data;

  // check uniqueness
  const existing = await db
    .select()
    .from(user)
    .where(eq(user.name, name))
    .limit(1);
  if (existing.length > 0 && existing[0].id !== userId) {
    return { error: "This name is already taken." };
  }

  await db.update(user).set({ name }).where(eq(user.id, userId));

  // trigger revalidation
  revalidatePath("/", "layout");

  return { success: true };
};
