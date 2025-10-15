"use server";

import "server-only";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { rounds, roundPlayers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth-server";

const JoinRoundSchema = z.object({
  roundId: z.string().uuid("Ungültige Runde."),
});

export type JoinRoundState = {
  ok: boolean;
  error: string;
  alreadyJoined?: boolean;
};

export async function joinRoundAction(
  _prev: JoinRoundState,
  formData: FormData,
): Promise<JoinRoundState> {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (typeof userId !== "string" || userId.length === 0) {
    return { ok: false, error: "Bitte melde dich an, um beizutreten." };
  }

  const parsed = JoinRoundSchema.safeParse({
    roundId: formData.get("roundId"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe.",
    };
  }

  const { roundId } = parsed.data;

  const roundExists = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(and(
      eq(rounds.id, roundId),
      eq(rounds.status, "open")
    ))
    .limit(1);

  if (roundExists.length === 0) {
    return { ok: false, error: "Diese Runde existiert nicht." };
  }

  const already = await db
    .select({ id: roundPlayers.id })
    .from(roundPlayers)
    .where(and(eq(roundPlayers.roundId, roundId), eq(roundPlayers.userId, userId)))
    .limit(1);

  if (already.length > 0) {
    return { ok: true, error: "", alreadyJoined: true };
  }

  try {
    await db.insert(roundPlayers).values({
      roundId,
      userId,
      role: "player",
    });

    revalidatePath("/", "layout");
    revalidatePath(`/rounds/${roundId}`);

    return { ok: true, error: "" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Beitritt fehlgeschlagen.";
    return { ok: false, error: message };
  }
}
