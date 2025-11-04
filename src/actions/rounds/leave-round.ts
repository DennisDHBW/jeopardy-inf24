"use server";

import "server-only";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { roundPlayers, rounds } from "@/db/schema";
import { getServerSession } from "@/lib/auth-server";
import {
  emitRoundParticipantsUpdate,
  emitRoundStateChange,
} from "@/lib/round_events";

const LeaveRoundSchema = z.object({
  roundId: z.string().uuid("Ungültige Runde."),
});

export type LeaveRoundState = {
  ok: boolean;
  error: string | null;
};

export async function leaveRoundAction(
  _prev: LeaveRoundState,
  formData: FormData,
): Promise<LeaveRoundState> {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      ok: false,
      error: "Bitte melde dich an, um die Runde zu verlassen.",
    };
  }

  const parsed = LeaveRoundSchema.safeParse({
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

  const [membership] = await db
    .select({
      id: roundPlayers.id,
      role: roundPlayers.role,
      joinedAt: roundPlayers.joinedAt,
    })
    .from(roundPlayers)
    .where(
      and(eq(roundPlayers.roundId, roundId), eq(roundPlayers.userId, userId)),
    )
    .limit(1);

  if (!membership) {
    return {
      ok: false,
      error: "Du bist dieser Runde nicht beigetreten.",
    };
  }

  if (membership.role === "host") {
    return {
      ok: false,
      error: "Der Host kann die Runde nicht verlassen.",
    };
  }

  const result = await db.transaction(async (tx) => {
    await tx
      .delete(roundPlayers)
      .where(
        and(eq(roundPlayers.roundId, roundId), eq(roundPlayers.userId, userId)),
      );

    const remainingPlayers = await tx
      .select({
        userId: roundPlayers.userId,
      })
      .from(roundPlayers)
      .where(
        and(eq(roundPlayers.roundId, roundId), eq(roundPlayers.role, "player")),
      )
      .orderBy(roundPlayers.joinedAt);

    const wasActive = roundRow.currentPlayerId === userId;
    const newActivePlayerId = wasActive
      ? (remainingPlayers[0]?.userId ?? null)
      : roundRow.currentPlayerId;

    if (wasActive || newActivePlayerId !== roundRow.currentPlayerId) {
      await tx
        .update(rounds)
        .set({ currentPlayerId: newActivePlayerId })
        .where(eq(rounds.id, roundId));
    }

    return {
      activePlayerChanged: wasActive,
      newActivePlayerId,
    };
  });

  revalidatePath("/", "layout");
  revalidatePath(`/rounds/${roundId}`);

  emitRoundParticipantsUpdate(roundId);

  if (result.activePlayerChanged) {
    emitRoundStateChange(roundId, {
      roundId,
      activePlayerId: result.newActivePlayerId ?? null,
    });
  }

  return { ok: true, error: null };
}
