"use server";
import "server-only";
import { z } from "zod";
import { changePassword } from "@/lib/auth-server";
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
  const raw = {
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
  };

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const { currentPassword, newPassword, confirmNewPassword } = parsed.data;

  if (newPassword !== confirmNewPassword) {
    return { error: "New passwords do not match." };
  }

  try {
    await changePassword({ body: { currentPassword, newPassword }, asResponse: false });
  } catch (err) {
    // better-auth returns errors for wrong current password
    return { error: (err as Error).message ?? "The current password you entered is incorrect." };
  }

  revalidatePath("/", "layout");

  return { success: true };
};
