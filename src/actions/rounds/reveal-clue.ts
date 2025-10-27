"use server";

import "server-only";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  roundClues,
  roundPlayers,
  questions,
  categories,
  rounds,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth-server";
import {
  emitRoundClueReveal,
  type RoundEventCluePayload,
} from "@/lib/round_events";

const RevealClueSchema = z.object({
  roundId: z.string().uuid("Ungültige Runde."),
  questionId: z.coerce.number().int("Ungültige Frage."),
});

export type RevealClueState = {
  ok: boolean;
  error: string | null;
  clue?: RoundEventCluePayload;
  alreadyRevealed?: boolean;
};

export async function revealClueAction(
  _prev: RevealClueState,
  formData: FormData,
): Promise<RevealClueState> {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (!userId) {
    return { ok: false, error: "Bitte melde dich an, um Fragen zu öffnen." };
  }

  const parsed = RevealClueSchema.safeParse({
    roundId: formData.get("roundId"),
    questionId: formData.get("questionId"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe.",
    };
  }

  const { roundId, questionId } = parsed.data;

  const membership = await db
    .select({ role: roundPlayers.role })
    .from(roundPlayers)
    .where(
      and(eq(roundPlayers.roundId, roundId), eq(roundPlayers.userId, userId)),
    )
    .limit(1);

  const isHost = membership[0]?.role === "host";

  if (!isHost) {
    return {
      ok: false,
      error: "Nur der Host kann Fragen aufdecken.",
    };
  }

  const [roundRow] = await db
    .select({ status: rounds.status })
    .from(rounds)
    .where(eq(rounds.id, roundId))
    .limit(1);

  if (!roundRow) {
    return { ok: false, error: "Diese Runde existiert nicht." };
  }

  if (roundRow.status !== "active") {
    return {
      ok: false,
      error: "Die Runde wurde noch nicht gestartet.",
    };
  }

  const clueRows = await db
    .select({
      roundId: roundClues.roundId,
      questionId: roundClues.questionId,
      revealed: roundClues.revealed,
      prompt: questions.prompt,
      answer: questions.answer,
      value: questions.value,
      categoryName: categories.name,
    })
    .from(roundClues)
    .innerJoin(questions, eq(questions.id, roundClues.questionId))
    .innerJoin(categories, eq(categories.id, questions.categoryId))
    .where(
      and(
        eq(roundClues.roundId, roundId),
        eq(roundClues.questionId, questionId),
      ),
    )
    .limit(1);

  if (clueRows.length === 0) {
    return { ok: false, error: "Diese Frage gehört nicht zu dieser Runde." };
  }

  const clueRow = clueRows[0];

  let mutated = false;
  if (!clueRow.revealed) {
    await db
      .update(roundClues)
      .set({ revealed: 1 })
      .where(
        and(
          eq(roundClues.roundId, roundId),
          eq(roundClues.questionId, questionId),
        ),
      );
    mutated = true;
  }

  const payload: RoundEventCluePayload = {
    roundId,
    questionId,
    prompt: clueRow.prompt,
    answer: clueRow.answer,
    value: clueRow.value,
    categoryName: clueRow.categoryName,
  };

  emitRoundClueReveal(roundId, payload);

  if (mutated) {
    revalidatePath("/", "layout");
    revalidatePath(`/rounds/${roundId}`);
  }

  return {
    ok: true,
    error: null,
    clue: payload,
    alreadyRevealed: clueRow.revealed === 1,
  };
}
