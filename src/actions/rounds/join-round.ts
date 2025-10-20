"use server";

import "server-only";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { rounds, roundPlayers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth-server";
import {
  emitRoundParticipantsUpdate,
  emitRoundStateChange,
} from "@/lib/round_events";

const JoinRoundSchema = z.object({
  roundId: z.string().uuid("Ungültige Runde."),
});

export type JoinRoundState = {
  ok: boolean;
  error: string;
  roundId?: string;
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

  const roundRows = await db
    .select({ id: rounds.id, currentPlayerId: rounds.currentPlayerId })
    .from(rounds)
    .where(and(eq(rounds.id, roundId), eq(rounds.status, "open")))
    .limit(1);

  if (roundRows.length === 0) {
    return { ok: false, error: "Diese Runde existiert nicht." };
  }
  const roundRow = roundRows[0];

  const already = await db
    .select({ id: roundPlayers.id })
    .from(roundPlayers)
    .where(
      and(eq(roundPlayers.roundId, roundId), eq(roundPlayers.userId, userId)),
    )
    .limit(1);

  if (already.length > 0) {
    return { ok: true, error: "", alreadyJoined: true, roundId };
  }

  try {
    let activePlayerChanged = false;
    await db.transaction(async (tx) => {
      await tx.insert(roundPlayers).values({
        roundId,
        userId,
        role: "player",
      });

      if (!roundRow?.currentPlayerId) {
        await tx
          .update(rounds)
          .set({ currentPlayerId: userId })
          .where(eq(rounds.id, roundId));
        activePlayerChanged = true;
      }
    });

    revalidatePath("/", "layout");
    revalidatePath(`/rounds/${roundId}`);
    emitRoundParticipantsUpdate(roundId);
    if (activePlayerChanged) {
      emitRoundStateChange(roundId, {
        roundId,
        activePlayerId: userId,
      });
    }

    return { ok: true, error: "", roundId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Beitritt fehlgeschlagen.";
    return { ok: false, error: message };
  }
}
