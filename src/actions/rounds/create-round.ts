"use server";

import "server-only";

import { db } from "@/db";
import { sql, eq, and } from "drizzle-orm"; // and ergänzt
import { z } from "zod";
import {
  rounds,
  roundCategories,
  roundClues,
  categories,
  questions,
  roundPlayers,
} from "@/db/schema";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/auth-server";

/*const CreateRoundSchema = z.object({
  name: z.string().trim().min(1, "Bitte einen Namen angeben.").max(100),
});*/

type ActionState = {
  ok: boolean;
  error: string;
  name?: string;
  roundId?: string;
};

export async function createRoundAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (typeof userId !== "string" || userId.length === 0) {
    return {
      ok: false,
      error: "Bitte melde dich an, um eine Runde zu erstellen.",
    };
  }

  /*const parsed = CreateRoundSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe.",
    };
  }

  const { name } = parsed.data;*/
  const roundId = crypto.randomUUID();

  // Mindestens 6 Kategorien?
  const catCount = await db.select({ c: sql<number>`count(*)` }).from(categories);
  if ((catCount[0]?.c ?? 0) < 6) {
    return { ok: false, error: "Es sind mindestens 6 Kategorien erforderlich." };
  }

  // Wertstufen, die je Kategorie exakt einmal vorkommen müssen
  const TIERS = [100, 200, 300, 400, 500] as const;

  try {
    await db.transaction(async (tx) => {
      // 1) Runde anlegen
      await tx.insert(rounds).values({ 
        id: roundId,
        //gameId: name,
      });

      // Host direkt als Teilnehmer anlegen
      await tx.insert(roundPlayers).values({
        roundId,
        userId,
        role: "host",
      });

      // 2) 6 zufällige Kategorien
      const sixCats = await tx
        .select({ id: categories.id })
        .from(categories)
        .orderBy(sql`random()`)
        .limit(6);

      // 3) round_categories (Spalten 0..5)
      await tx.insert(roundCategories).values(
        sixCats.map((c, columnIndex) => ({
          roundId,
          categoryId: c.id,
          columnIndex,
        })),
      );

      // 4) Pro Kategorie GENAU 1 Frage je Wertstufe (100..500), zufällig
      for (let col = 0; col < sixCats.length; col++) {
        const categoryEntry = sixCats[col];

        if (!categoryEntry) {
          throw new Error("Unerwarteter Fehler beim Ermitteln der Kategorien.");
        }

        const catId = categoryEntry.id;

        // Für jede Stufe 100..500 genau eine Frage ziehen
        const picked: { questionId: number; rowIndex: number }[] = [];

        for (let i = 0; i < TIERS.length; i++) {
          const value = TIERS[i];

          const q = await tx
            .select({ id: questions.id })
            .from(questions)
            .where(and(eq(questions.categoryId, catId), eq(questions.value, value)))
            .orderBy(sql`random()`)
            .limit(1);

          if (q.length === 0) {
            // Aussagekräftige Fehlermeldung, damit du Seeds schnell nachziehen kannst
            throw new Error(
              `Kategorie ${catId} hat keine Frage mit Wert ${value}. ` +
                `Bitte je Kategorie die Stufen 100, 200, 300, 400, 500 befüllen.`,
            );
          }

          const question = q[0];
          if (!question) {
            throw new Error(
              `Kategorie ${catId} hat keine Frage mit Wert ${value}.`,
            );
          }

          picked.push({ questionId: question.id, rowIndex: i }); // i = 0..4 → 100..500
        }

        // round_clues für diese Kategorie eintragen
        await tx.insert(roundClues).values(
          picked.map((p) => ({
            roundId,
            questionId: p.questionId,
            columnIndex: col,      // Spalte = Kategorie
            rowIndex: p.rowIndex,  // Zeile 0..4 = 100..500
            revealed: 0,
            answered: 0,
          })),
        );
      }
    });

    revalidatePath("/", "layout");

    // Variante B: Client pusht danach auf /rounds/:id
    //return { ok: true, error: "", name, roundId };
    return { ok: true, error: "", roundId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler beim Erstellen der Runde.";
    return { ok: false, error: msg };
  }
}
