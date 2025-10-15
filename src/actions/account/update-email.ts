"use server";
import "server-only";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { changeEmail } from "@/lib/auth-server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

const updateEmailSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
});

export const updateEmail = async (_prev: { error?: string }, formData: FormData) => {
  // Coerce FormData values to strings to avoid null/File types causing zod to fail silently
  const userIdRaw = formData.get("userId");
  const emailRaw = formData.get("email");

  const raw = {
    userId: typeof userIdRaw === "string" ? userIdRaw : (userIdRaw ? String(userIdRaw) : ""),
    email: typeof emailRaw === "string" ? emailRaw : (emailRaw ? String(emailRaw) : ""),
  };

  // Helpful debug output when running locally. Enable by setting DEBUG_UPDATE_EMAIL=1 in env.
  try {
    if (process.env.DEBUG_UPDATE_EMAIL) {
      // Do not log full formData in prod; only when debugging locally.
      // Log redacted/small values to help diagnose parsing issues.
      // eslint-disable-next-line no-console
      console.debug("updateEmail - raw incoming", { userId: raw.userId ? "<present>" : "<missing>", email: raw.email ? "<present>" : "<missing>" });
    }
  } catch (_) {
    /* ignore logging errors */
  }

  const parsed = updateEmailSchema.safeParse(raw);
  if (!parsed.success) {
    // Provide a readable error message for the client
    return { error: z.prettifyError ? z.prettifyError(parsed.error) : parsed.error.message };
  }

  const { userId, email } = parsed.data;

  if (process.env.DEBUG_UPDATE_EMAIL) {
    try {
      const masked = (e: string) => {
        const [local, domain] = e.split("@");
        return `${local?.charAt(0) ?? "*"}***@${domain ?? "***"}`;
      };
      // eslint-disable-next-line no-console
      console.debug("updateEmail - parsed", { userId, email: masked(email) });
    } catch (_) {}
  }

  // Short-circuit for local debugging: if this env var is set, return success immediately.
  // Use this to verify the client form wiring. Do NOT enable in production.
  if (process.env.DEBUG_UPDATE_EMAIL_SHORTCIRCUIT) {
    return { success: true };
  }

  // Ensure the email isn't already used by another user
  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (existing.length > 0 && existing[0].id !== userId) {
    return { error: "This email address is already in use." };
  }

  // Delegate to better-auth changeEmail (server-side helper)
  try {
    // Pass current request headers so better-auth can resolve the current session
    await changeEmail({ body: { newEmail: email }, headers: await headers(), asResponse: false });
    if (process.env.DEBUG_UPDATE_EMAIL) {
      // eslint-disable-next-line no-console
      console.debug("updateEmail - changeEmail succeeded for userId", userId);
    }
  } catch (err) {
    // If the auth provider disallows changing email (common when not enabled),
    // fall back to updating the local user record so the app UI reflects the new email.
    const msg = (err as Error).message ?? "Failed to change email via auth provider";
    try {
      // eslint-disable-next-line no-console
      console.error("updateEmail - changeEmail error:", err);
    } catch (_) {}

    if (String(msg).toLowerCase().includes("change email is disabled") || String(msg).toLowerCase().includes("change email disabled")) {
      try {
        // Log that we're falling back
        // eslint-disable-next-line no-console
        console.warn("updateEmail - falling back to local DB update because changeEmail is disabled");
      } catch (_) {}
      // proceed to update the local DB below (skip returning an error)
    } else {
      return { error: msg };
    }
  }

  // Also update our user record
  try {
    await db.update(user).set({ email }).where(eq(user.id, userId));
    if (process.env.DEBUG_UPDATE_EMAIL) {
      try {
        const updated = await db.select().from(user).where(eq(user.id, userId)).limit(1);
        // eslint-disable-next-line no-console
        console.debug("updateEmail - local DB updated:", { id: userId, email: updated?.[0]?.email });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("updateEmail - failed to fetch updated user:", err);
      }
    }
  } catch (err) {
    try {
      // eslint-disable-next-line no-console
      console.error("updateEmail - DB update error:", err);
    } catch (_) {}
    return { error: (err as Error).message ?? "Failed to update local user record" };
  }

  revalidatePath("/", "layout");

  return { success: true };
};
