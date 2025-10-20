"use server";

import "server-only";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { sql, and, eq } from "drizzle-orm";
import { db } from "@/db";
import { roundClues, roundPlayers, rounds, questions } from "@/db/schema";
import { getServerSession } from "@/lib/auth-server";
import {
  emitRoundParticipantsUpdate,
  emitRoundStateChange,
  type RoundStatePayload,
} from "@/lib/round_events";

const EvaluateClueSchema = z.object({
  roundId: z.string().uuid("Ungültige Runde."),
  questionId: z.coerce.number().int("Ungültige Frage."),
  result: z.enum(["correct", "incorrect"]),
});

export type EvaluateClueState = {
  ok: boolean;
  error: string | null;
  result?: "correct" | "incorrect";
  questionId?: number;
};

export async function evaluateClueAction(
  _prev: EvaluateClueState,
  formData: FormData,
): Promise<EvaluateClueState> {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      ok: false,
      error: "Bitte melde dich an, um die Frage zu bewerten.",
    };
  }

  const parsed = EvaluateClueSchema.safeParse({
    roundId: formData.get("roundId"),
    questionId: formData.get("questionId"),
    result: formData.get("result"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe.",
    };
  }

  const { roundId, questionId, result } = parsed.data;

  const hostMembership = await db
    .select({ role: roundPlayers.role })
    .from(roundPlayers)
    .where(
      and(eq(roundPlayers.roundId, roundId), eq(roundPlayers.userId, userId)),
    )
    .limit(1);

  if (hostMembership[0]?.role !== "host") {
    return {
      ok: false,
      error: "Nur der Host darf die Antwort bewerten.",
    };
  }

  try {
    const payload: RoundStatePayload | null = await db.transaction(
      async (tx) => {
        const clueRows = await tx
          .select({
            revealed: roundClues.revealed,
            answered: roundClues.answered,
            value: questions.value,
          })
          .from(roundClues)
          .innerJoin(questions, eq(questions.id, roundClues.questionId))
          .where(
            and(
              eq(roundClues.roundId, roundId),
              eq(roundClues.questionId, questionId),
            ),
          )
          .limit(1);

        const clueRow = clueRows[0];
        if (!clueRow) {
          throw new Error("Diese Frage gehört nicht zu dieser Runde.");
        }

        if (!clueRow.revealed) {
          throw new Error("Diese Frage wurde noch nicht geöffnet.");
        }

        if (clueRow.answered) {
          throw new Error("Diese Frage wurde bereits bewertet.");
        }

        const roundRow = await tx
          .select({ currentPlayerId: rounds.currentPlayerId })
          .from(rounds)
          .where(eq(rounds.id, roundId))
          .limit(1);

        const players = await tx
          .select({
            userId: roundPlayers.userId,
          })
          .from(roundPlayers)
          .where(
            and(
              eq(roundPlayers.roundId, roundId),
              eq(roundPlayers.role, "player"),
            ),
          )
          .orderBy(roundPlayers.joinedAt);

        if (players.length === 0) {
          throw new Error("Es sind keine Spieler für diese Runde registriert.");
        }

        const orderedIds = players.map((player) => player.userId);
        let activePlayerId = roundRow[0]?.currentPlayerId ?? null;

        if (!activePlayerId || !orderedIds.includes(activePlayerId)) {
          activePlayerId = orderedIds[0] ?? null;
        }

        if (!activePlayerId) {
          throw new Error("Aktueller Spieler konnte nicht ermittelt werden.");
        }

        const questionValue = clueRow.value ?? 0;
        const delta = result === "correct" ? questionValue : -questionValue;

        if (delta !== 0) {
          await tx
            .update(roundPlayers)
            .set({
              score: sql`${roundPlayers.score} + ${delta}`,
            })
            .where(
              and(
                eq(roundPlayers.roundId, roundId),
                eq(roundPlayers.userId, activePlayerId),
              ),
            );
        }

        await tx
          .update(roundClues)
          .set({
            answered: 1,
            answeredAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(
            and(
              eq(roundClues.roundId, roundId),
              eq(roundClues.questionId, questionId),
            ),
          );

        const currentIndex = orderedIds.indexOf(activePlayerId);
        const nextPlayerId =
          orderedIds.length > 0
            ? orderedIds[(currentIndex + 1) % orderedIds.length]
            : activePlayerId;

        await tx
          .update(rounds)
          .set({ currentPlayerId: nextPlayerId })
          .where(eq(rounds.id, roundId));

        return {
          roundId,
          activePlayerId: nextPlayerId ?? null,
          questionId,
          result,
        } satisfies RoundStatePayload;
      },
    );

    if (!payload) {
      return { ok: false, error: "Bewertung fehlgeschlagen." };
    }

    revalidatePath("/", "layout");
    revalidatePath(`/rounds/${roundId}`);
    emitRoundParticipantsUpdate(roundId);
    emitRoundStateChange(roundId, payload);

    return {
      ok: true,
      error: null,
      questionId,
      result,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bewertung fehlgeschlagen.";
    return { ok: false, error: message };
  }
}
