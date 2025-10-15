"use server";
import "server-only";
import { z } from "zod";
import { changePassword } from "@/lib/auth-server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmNewPassword: z.string().min(8),
});

export const changeUserPassword = async (
  _prev: { error?: string },
  formData: FormData,
) => {
  // Coerce FormData values to strings to avoid null/File types causing zod to fail silently
  const curRaw = formData.get("currentPassword");
  const newRaw = formData.get("newPassword");
  const confRaw = formData.get("confirmNewPassword");

  const raw = {
    currentPassword: typeof curRaw === "string" ? curRaw : (curRaw ? String(curRaw) : ""),
    newPassword: typeof newRaw === "string" ? newRaw : (newRaw ? String(newRaw) : ""),
    confirmNewPassword: typeof confRaw === "string" ? confRaw : (confRaw ? String(confRaw) : ""),
  };

  // Optional debug logging when DEBUG_CHANGE_PASSWORD is set
  try {
    if (process.env.DEBUG_CHANGE_PASSWORD) {
      // eslint-disable-next-line no-console
      console.debug("changeUserPassword - raw incoming", {
        hasCurrent: raw.currentPassword ? "<present>" : "<missing>",
        hasNew: raw.newPassword ? "<present>" : "<missing>",
      });
    }
  } catch (_) {
    /* ignore logging errors */
  }

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const { currentPassword, newPassword, confirmNewPassword } = parsed.data;

  if (newPassword !== confirmNewPassword) {
    return { error: "New passwords do not match." };
  }

  // Short-circuit for local debugging: if this env var is set, return success immediately.
  // Use this to verify the client form wiring. Do NOT enable in production.
  if (process.env.DEBUG_CHANGE_PASSWORD_SHORTCIRCUIT) {
    return { success: true };
  }

  try {
    // Pass current request headers so better-auth can resolve the current session
    await changePassword({ body: { currentPassword, newPassword }, headers: await headers(), asResponse: false });
  } catch (err) {
    // better-auth returns errors for wrong current password
    return { error: (err as Error).message ?? "The current password you entered is incorrect." };
  }

  revalidatePath("/", "layout");

  return { success: true };
};
