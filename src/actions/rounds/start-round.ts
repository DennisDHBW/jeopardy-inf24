"use server";

import "server-only";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { roundPlayers, rounds } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth-server";
import { emitRoundStateChange } from "@/lib/round_events";

const StartRoundSchema = z.object({
  roundId: z.string().uuid("Ungültige Runde."),
});

export type StartRoundState = {
  ok: boolean;
  error: string | null;
};

export async function startRoundAction(
  _prev: StartRoundState,
  formData: FormData,
): Promise<StartRoundState> {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      ok: false,
      error: "Bitte melde dich an, um die Runde zu starten.",
    };
  }

  const parsed = StartRoundSchema.safeParse({
    roundId: formData.get("roundId"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe.",
    };
  }

  const { roundId } = parsed.data;

  const [roundRow] = await db
    .select({
      id: rounds.id,
      status: rounds.status,
      currentPlayerId: rounds.currentPlayerId,
    })
    .from(rounds)
    .where(eq(rounds.id, roundId))
    .limit(1);

  if (!roundRow) {
    return { ok: false, error: "Diese Runde existiert nicht." };
  }

  if (roundRow.status === "active") {
    return { ok: false, error: "Die Runde läuft bereits." };
  }

  if (roundRow.status === "closed") {
    return { ok: false, error: "Diese Runde wurde bereits abgeschlossen." };
  }

  const [membership] = await db
    .select({ role: roundPlayers.role })
    .from(roundPlayers)
    .where(
      and(eq(roundPlayers.roundId, roundId), eq(roundPlayers.userId, userId)),
    )
    .limit(1);

  if (membership?.role !== "host") {
    return {
      ok: false,
      error: "Nur der Host darf die Runde starten.",
    };
  }

  const players = await db
    .select({
      userId: roundPlayers.userId,
    })
    .from(roundPlayers)
    .where(
      and(eq(roundPlayers.roundId, roundId), eq(roundPlayers.role, "player")),
    )
    .orderBy(roundPlayers.joinedAt);

  if (players.length === 0) {
    return {
      ok: false,
      error:
        "Es muss mindestens ein Spieler beitreten, bevor die Runde startet.",
    };
  }

  const fallbackPlayerId = players[0]?.userId ?? null;
  const nextActivePlayerId = roundRow.currentPlayerId ?? fallbackPlayerId;

  if (!nextActivePlayerId) {
    return {
      ok: false,
      error: "Es konnte kein aktiver Spieler festgelegt werden.",
    };
  }

  await db
    .update(rounds)
    .set({
      status: "active",
      currentPlayerId: nextActivePlayerId,
    })
    .where(eq(rounds.id, roundId));

  revalidatePath("/", "layout");
  revalidatePath(`/rounds/${roundId}`);

  emitRoundStateChange(roundId, {
    roundId,
    activePlayerId: nextActivePlayerId,
    status: "active",
  });

  return {
    ok: true,
    error: null,
  };
}
