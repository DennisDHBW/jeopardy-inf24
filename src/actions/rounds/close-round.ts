"use server";

import "server-only";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { rounds, roundPlayers, user as users } from "@/db/schema";
import { getServerSession } from "@/lib/auth-server";
import {
  emitRoundParticipantsUpdate,
  emitRoundStateChange,
} from "@/lib/round_events";
import { determineRoundWinners } from "@/lib/round-status";

const CloseRoundSchema = z.object({
  roundId: z.string().uuid("Ungültige Runde."),
});

export type CloseRoundState = {
  ok: boolean;
  error: string | null;
};

export async function closeRoundAction(
  _prev: CloseRoundState,
  formData: FormData,
): Promise<CloseRoundState> {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      ok: false,
      error: "Bitte melde dich an, um die Runde zu schließen.",
    };
  }

  const parsed = CloseRoundSchema.safeParse({
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
    })
    .from(rounds)
    .where(eq(rounds.id, roundId))
    .limit(1);

  if (!roundRow) {
    return { ok: false, error: "Diese Runde existiert nicht." };
  }

  if (roundRow.status === "closed") {
    return { ok: true, error: null };
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
      error: "Nur der Host darf die Runde schließen.",
    };
  }

  const { winners } = await db.transaction(async (tx) => {
    const participants = await tx
      .select({
        userId: roundPlayers.userId,
        role: roundPlayers.role,
        score: roundPlayers.score,
        name: users.name,
      })
      .from(roundPlayers)
      .leftJoin(users, eq(users.id, roundPlayers.userId))
      .where(eq(roundPlayers.roundId, roundId));

    const computedWinners = determineRoundWinners(
      participants.map((participant) => ({
        userId: participant.userId,
        name: participant.name ?? null,
        role: participant.role === "host" ? "host" : "player",
        score: participant.score ?? 0,
      })),
    );

    await tx
      .update(rounds)
      .set({
        status: "closed",
        currentPlayerId: null,
      })
      .where(eq(rounds.id, roundId));

    return { winners: computedWinners };
  });

  revalidatePath("/", "layout");
  revalidatePath(`/rounds/${roundId}`);

  emitRoundParticipantsUpdate(roundId);
  emitRoundStateChange(roundId, {
    roundId,
    activePlayerId: null,
    status: "closed",
    winners,
  });

  return {
    ok: true,
    error: null,
  };
}
