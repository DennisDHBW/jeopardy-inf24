"use server";

import "server-only";
import { z } from "zod";
import { redirect } from "next/navigation";
import { signInEmail } from "@/lib/auth-server";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export type SignInSchema = z.infer<typeof loginSchema>;

export const login = async (
  _prevState: { error?: string },
  formData: FormData,
): Promise<never | { error?: string }> => {
  console.debug("Calling login server action!");

  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const { success, data, error } = loginSchema.safeParse(rawData);

  if (!success) {
    return { error: z.prettifyError(error) };
  }

  try {
    await signInEmail({
      body: {
        email: data.email,
        password: data.password,
      },
      asResponse: false,
    });
  } catch (err) {
    console.error(err);
    return {
      error: (err as Error).message ?? "Something went wrong",
    };
  }

  console.debug("Login successful");

  redirect("/game/new");
};
