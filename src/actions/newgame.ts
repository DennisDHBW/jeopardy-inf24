// app/actions/create-round.ts
"use server";

import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1, "Bitte einen Namen angeben."),
});

export async function createRoundAction(prev: any, formData: FormData) {
  const parsed = schema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors.name?.[0] ?? "Ungültiger Name" };
  }

  const { name } = parsed.data;
  // hier würdest du Runde anlegen usw.
  const roundId = crypto.randomUUID();

  // WICHTIG: kein redirect – wir geben Daten zurück
  return { ok: true, name, roundId };
}
